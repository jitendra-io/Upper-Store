const crypto = require('crypto');
const { db } = require('../config/firebase');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtConfig');
const { uploadFileToCloudOrLocal } = require('../services/imagekitService');
const { invalidateSearchCache } = require('../services/searchService');

const isOfficialAuthorized = (req) => {
  if (!req.user) return false;
  return req.user.role === 'admin';
};

/**
 * Format date to exact Month and Year with no day/date (e.g., "November 2026")
 */
const formatExactMonthYear = (dateInput = new Date()) => {
  if (typeof dateInput === 'string' && /^[A-Z][a-z]+ \d{4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const valid = isNaN(d.getTime()) ? new Date() : d;
  return valid.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

// @desc    Get authenticated user's developer profile
// @route   GET /api/developers/me
// @access  Private (Authenticated User)
const getMyDeveloperProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const cleanEmail = (req.user.email || '').trim().toLowerCase();

    let devSnap = await db.collection('developers').where('userId', '==', userId).limit(1).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }

    if (devSnap.empty) {
      let previousConsent = null;
      try {
        let uDoc = userId ? await db.collection('users').doc(userId).get() : null;
        if ((!uDoc || !uDoc.exists) && cleanEmail) {
          const uSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
          if (!uSnap.empty) uDoc = uSnap.docs[0];
        }
        if (uDoc && uDoc.exists) {
          const uData = uDoc.data();
          if (uData.developerConsentWithdrawnAt || uData.developerConsentAcceptedAt) {
            previousConsent = {
              status: uData.developerConsentStatus || 'withdrawn',
              acceptedAt: uData.developerConsentAcceptedAt || null,
              withdrawnAt: uData.developerConsentWithdrawnAt || null,
            };
          }
        }
      } catch (prevErr) {
        // ignore
      }

      return res.json({
        isRegistered: false,
        developer: null,
        previousConsent,
      });
    }

    const devDoc = devSnap.docs[0];
    const devData = devDoc.data();

    // Count user's uploaded products (by both email and UID to ensure accuracy)
    let productsCount = 0;
    try {
      const emailSnap = cleanEmail
        ? await db.collection('products').where('developerEmail', '==', cleanEmail).get()
        : { docs: [] };
      const idSnap = userId
        ? await db.collection('products').where('developerId', '==', userId).get()
        : { docs: [] };
      const pSet = new Set();
      emailSnap.docs.forEach((d) => pSet.add(d.id));
      idSnap.docs.forEach((d) => pSet.add(d.id));
      productsCount = pSet.size;
    } catch (e) {
      // Ignore count error
    }

    const joinedAt = devData.joinedAt || formatExactMonthYear(devData.createdAt || devDoc.createTime?.toDate() || new Date());

    // Real-time membership check to keep developer VIP ring and status in sync
    let effectiveVipPlan = 'free';
    let isVipActive = false;
    let subscriptionEnded = false;
    try {
      const uDoc = userId ? await db.collection('users').doc(userId).get() : null;
      const uData = uDoc && uDoc.exists ? uDoc.data() : null;
      const m = uData?.membership;
      const vUntil = m?.validUntil;
      const isExp = Boolean(vUntil && new Date(vUntil) < new Date());
      // An active cancellation requires membership.isCancelled or cancellation after last subscription on free tier
      const hasActiveCancellation = Boolean(
        m?.isCancelled ||
        (uData?.vipCancelledAt && (!uData?.lastSubscribedAt || new Date(uData.vipCancelledAt) >= new Date(uData.lastSubscribedAt)) && m?.plan === 'free')
      );
      if (m && (m.plan === 'pro' || m.plan === 'elite') && !isExp && !hasActiveCancellation) {
        effectiveVipPlan = m.plan;
        isVipActive = true;
        subscriptionEnded = false;
        if (devData.vipPlan !== m.plan || !devData.isVipActive || devData.subscriptionEnded || devData.cancelledAt) {
          await devDoc.ref.update({
            vipPlan: m.plan,
            isVipActive: true,
            subscriptionEnded: false,
            cancelledAt: null,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        subscriptionEnded = Boolean(isExp || hasActiveCancellation || m?.plan === 'free' || devData.subscriptionEnded);
        effectiveVipPlan = 'free';
        isVipActive = false;
        if (devData.vipPlan && devData.vipPlan !== 'free') {
          await devDoc.ref.update({
            vipPlan: 'free',
            isVipActive: false,
            subscriptionEnded: true,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (uErr) {
      effectiveVipPlan = devData.vipPlan || 'free';
    }

    res.json({
      isRegistered: true,
      developer: {
        id: devDoc.id,
        ...devData,
        vipPlan: effectiveVipPlan,
        isVipActive,
        subscriptionEnded,
        joinedAt,
        productsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching developer profile:', error);
    res.status(500).json({ message: 'Failed to retrieve developer profile.' });
  }
};

// @desc    Register or Update Developer Profile with Consent (DPDP Act 2023 Compliant)
// @route   POST /api/developers/register
// @access  Private (Active VIP Member)
const registerDeveloperKyc = async (req, res) => {
  const {
    legalName,
    displayName,
    username,
    bio,
    phone,
  } = req.body;

  const userId = req.user.uid;
  const cleanEmail = (req.user.email || '').trim().toLowerCase();

  // 1. Validation of required fields: ONLY legal name, developer name, and phone
  if (!legalName || !displayName || !phone) {
    return res.status(400).json({
      message: 'All required fields must be provided: Full Legal Name, Public Developer Name, and Mobile Number.',
    });
  }

  // 2. Validate Phone Number (10 digits)
  const cleanPhone = phone.toString().replace(/[\s-+()]/g, '');
  if (!/^\d{10}$/.test(cleanPhone)) {
    return res.status(400).json({
      message: 'Invalid phone number. Must be a valid 10-digit mobile number.',
    });
  }

  // 3. Validate Developer Username: lowercase letters, numbers, _, and . only
  let cleanDevUsername = null;
  if (username) {
    const cand = username.trim().toLowerCase();
    if (cand.length < 3 || cand.length > 30) {
      return res.status(400).json({
        message: 'Developer username must be between 3 and 30 characters in length.',
      });
    }
    if (!/^[a-z0-9_.]+$/.test(cand)) {
      return res.status(400).json({
        message: 'Username can only contain small letters (a-z), numbers (0-9), underscores (_), and dots (.). No other special characters are allowed.',
      });
    }
    // Check uniqueness across users
    const userSnap = await db.collection('users').where('username', '==', cand).limit(1).get();
    if (!userSnap.empty && userSnap.docs[0].id !== userId) {
      return res.status(400).json({
        message: 'Username @' + cand + ' is already taken. Please choose another.',
      });
    }
    cleanDevUsername = cand;
  }

  try {
    // 4. Verify User exists and has active VIP membership
    let userDocRef = null;
    let userData = null;

    if (userId) {
      const doc = await db.collection('users').doc(userId).get();
      if (doc.exists) {
        userDocRef = doc.ref;
        userData = doc.data();
      }
    }

    if (!userData && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDocRef = snap.docs[0].ref;
        userData = snap.docs[0].data();
      }
    }

    if (!userData) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const membership = userData.membership;
    const isVipValid =
      membership &&
      (membership.plan === 'pro' || membership.plan === 'elite') &&
      (!membership.validUntil || new Date(membership.validUntil) > new Date());

    if (!isVipValid && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Active VIP membership (Pro or Elite) is required to unlock Developer Publishing.',
      });
    }

    // 5. Check for existing developer document
    let existingDevSnap = await db.collection('developers').where('userId', '==', userId).limit(1).get();
    if (existingDevSnap.empty && cleanEmail) {
      existingDevSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const devPayload = {
      userId,
      email: cleanEmail,
      username: cleanDevUsername || userData.username || null,
      legalName: legalName.trim(),
      displayName: displayName.trim(),
      bio: (bio || userData.bio || '').trim().slice(0, 500),
      phone: cleanPhone,
      vipPlan: membership?.plan || 'pro',
      avatar: userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
      consentStatus: 'active',
      consentAcceptedAt: nowIso,
      consentWithdrawnAt: null,
      consentHistory: [
        {
          action: 'accepted',
          type: 'developer_consent_dpdp',
          legalBasis: 'DPDP Act 2023 Section 6',
          timestamp: nowIso,
        },
      ],
      updatedAt: nowIso,
    };

    let devId;
    let devJoinedAt;
    if (!existingDevSnap.empty) {
      // Update existing
      const existingDoc = existingDevSnap.docs[0];
      devId = existingDoc.id;
      const existingData = existingDoc.data();

      // Preserve suspension status if set by admin
      devPayload.isSuspended = Boolean(existingData.isSuspended);
      devPayload.suspendedAt = existingData.suspendedAt || null;
      devPayload.suspensionReason = existingData.suspensionReason || null;
      devPayload.createdAt = existingData.createdAt || existingDoc.createTime?.toDate()?.toISOString() || nowIso;
      // Retain original consentAcceptedAt if already set
      devPayload.consentAcceptedAt = existingData.consentAcceptedAt || nowIso;
      devJoinedAt = existingData.joinedAt || formatExactMonthYear(devPayload.createdAt);
      devPayload.joinedAt = devJoinedAt;

      await existingDoc.ref.update(devPayload);
    } else {
      // Create new
      devJoinedAt = formatExactMonthYear(now);
      devPayload.isSuspended = false;
      devPayload.suspendedAt = null;
      devPayload.suspensionReason = null;
      devPayload.joinedAt = devJoinedAt;
      devPayload.createdAt = nowIso;

      const newDoc = await db.collection('developers').add(devPayload);
      devId = newDoc.id;
    }

    // Mark user record as developer with consent audit timestamps
    if (userDocRef) {
      try {
        const uUpdate = {
          isDeveloper: true,
          developerDisplayName: displayName.trim(),
          developerJoinedAt: devJoinedAt,
          developerUpdatedAt: nowIso,
          developerConsentStatus: 'active',
          developerConsentAcceptedAt: devPayload.consentAcceptedAt || nowIso,
          developerConsentWithdrawnAt: null,
        };
        if (cleanDevUsername) {
          uUpdate.username = cleanDevUsername;
        }
        if (bio !== undefined) {
          uUpdate.bio = (bio || '').trim().slice(0, 500);
        }
        await userDocRef.update(uUpdate);
      } catch (uErr) {
        console.warn('Error updating user record developer flag:', uErr.message);
      }
    }

    // Invalidate search cache
    try {
      invalidateSearchCache();
    } catch (e) {
      // ignore
    }

    res.json({
      message: 'Developer profile registered successfully with statutory consent. You can now publish software releases and send notifications.',
      developer: {
        id: devId,
        ...devPayload,
      },
    });
  } catch (error) {
    console.error('Error registering developer profile:', error);
    res.status(500).json({ message: 'Server error while registering developer profile.' });
  }
};

// @desc    Withdraw developer consent & deregister developer profile (DPDP Act 2023 Section 6(4))
// @route   POST /api/developers/withdraw-consent
// @access  Private (Authenticated User)
const withdrawDeveloperConsent = async (req, res) => {
  try {
    const userId = req.user.uid;
    const cleanEmail = (req.user.email || '').trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // 1. Find developer record to capture timestamps and log audit trail before deleting
    let devSnap = await db.collection('developers').where('userId', '==', userId).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).get();
    }

    let existingAcceptedAt = null;
    for (const doc of devSnap.docs) {
      const dData = doc.data();
      if (dData.consentAcceptedAt) {
        existingAcceptedAt = dData.consentAcceptedAt;
      }
      // Record in regulatory consent audit trail
      try {
        await db.collection('consent_audit_logs').add({
          userId: userId || dData.userId,
          email: cleanEmail || dData.email,
          role: 'developer',
          action: 'withdrawn',
          legalBasis: 'DPDP Act 2023 Section 6(4)',
          consentAcceptedAt: dData.consentAcceptedAt || dData.createdAt || null,
          consentWithdrawnAt: nowIso,
          timestamp: nowIso,
        });
      } catch (auditErr) {
        console.warn('Developer consent audit log error:', auditErr.message);
      }
      await doc.ref.delete();
    }

    // 2. Update user doc to revoke developer status and store consent withdrawal timestamp
    const devUpdate = {
      isDeveloper: false,
      developerWithdrawnAt: nowIso,
      developerConsentStatus: 'withdrawn',
      developerConsentWithdrawnAt: nowIso,
    };
    if (existingAcceptedAt) {
      devUpdate.developerConsentAcceptedAt = existingAcceptedAt;
    }

    if (userId) {
      const uDoc = await db.collection('users').doc(userId).get();
      if (uDoc.exists) {
        const uData = uDoc.data();
        const currentHist = Array.isArray(uData.consentHistory) ? uData.consentHistory : [];
        devUpdate.consentHistory = [
          ...currentHist,
          {
            action: 'withdrawn',
            type: 'developer_consent_dpdp',
            legalBasis: 'DPDP Act 2023 Section 6(4)',
            timestamp: nowIso,
          },
        ];
        await uDoc.ref.update(devUpdate);
      }
    } else if (cleanEmail) {
      const uSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!uSnap.empty) {
        await uSnap.docs[0].ref.update(devUpdate);
      }
    }

    // 3. Reset products published by this developer so premium rings and tags are removed
    try {
      const nowIso = new Date().toISOString();
      const pSnap = userId ? await db.collection('products').where('developerId', '==', userId).get() : { docs: [] };
      for (const p of pSnap.docs) {
        await p.ref.update({
          developerTier: 'free',
          isDeveloperProduct: false,
          updatedAt: nowIso,
        });
      }
      if (cleanEmail) {
        const pByEmail = await db.collection('products').where('developerEmail', '==', cleanEmail).get();
        for (const p of pByEmail.docs) {
          await p.ref.update({
            developerTier: 'free',
            isDeveloperProduct: false,
            updatedAt: nowIso,
          });
        }
      }
      const cacheService = require('../services/cacheService');
      cacheService.invalidate('products_list');
    } catch (pErr) {
      // ignore
    }

    // 4. Invalidate search cache
    try {
      invalidateSearchCache();
    } catch (e) {
      // ignore
    }

    res.json({
      success: true,
      message: 'Developer consent successfully withdrawn and profile deregistered.',
    });
  } catch (error) {
    console.error('Error withdrawing developer consent:', error);
    res.status(500).json({ message: 'Failed to withdraw developer consent. Please contact support.' });
  }
};

// @desc    Admin: Get all developers with their details and product counts
// @route   GET /api/developers
// @access  Private (Admin)
const getAllDevelopers = async (req, res) => {
  try {
    const snap = await db.collection('developers').get();
    const developers = [];

    // Fetch all products once to compute developer product counts
    let allProducts = [];
    try {
      const prodSnap = await db.collection('products').get();
      allProducts = prodSnap.docs.map((d) => d.data());
    } catch (e) {
      console.warn('Error fetching products for developer count:', e.message);
    }

    for (const doc of snap.docs) {
      const d = doc.data();
      const devEmail = (d.email || '').toLowerCase();
      const devUserId = d.userId;

      // Count products published by this developer
      const prodCount = allProducts.filter(
        (p) =>
          (p.developerEmail && p.developerEmail.toLowerCase() === devEmail) ||
          (p.developerId && p.developerId === devUserId)
      ).length;

      developers.push({
        id: doc.id,
        userId: d.userId,
        email: d.email,
        username: d.username,
        legalName: d.legalName,
        displayName: d.displayName,
        phone: d.phone,
        vipPlan: (d.subscriptionEnded || d.vipPlan === 'free') ? 'free' : (d.vipPlan || 'free'),
        avatar: d.avatar,
        isSuspended: Boolean(d.isSuspended),
        suspendedAt: d.suspendedAt || null,
        suspensionReason: d.suspensionReason || null,
        consentStatus: d.consentStatus || 'active',
        consentAcceptedAt: d.consentAcceptedAt || d.createdAt || null,
        consentWithdrawnAt: d.consentWithdrawnAt || null,
        productsCount: prodCount,
        joinedAt: d.joinedAt || formatExactMonthYear(d.createdAt || doc.createTime?.toDate() || new Date()),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });
    }

    // Sort newest first
    developers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(developers);
  } catch (error) {
    console.error('Error fetching developers for admin:', error);
    res.status(500).json({ message: 'Failed to fetch developer list.' });
  }
};

// @desc    Admin: Suspend or Reinstate a developer account
// @route   POST /api/developers/:id/suspend
// @access  Private (Admin)
const toggleDeveloperSuspension = async (req, res) => {
  const { id } = req.params;
  const { isSuspended, reason } = req.body;

  try {
    const docRef = db.collection('developers').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Developer record not found.' });
    }

    const shouldSuspend = Boolean(isSuspended);
    const nowIso = new Date().toISOString();

    const updatePayload = {
      isSuspended: shouldSuspend,
      suspendedAt: shouldSuspend ? nowIso : null,
      suspensionReason: shouldSuspend ? (reason || 'Suspended by platform administrator.').trim() : null,
      updatedAt: nowIso,
    };

    await docRef.update(updatePayload);

    console.log(
      `[Admin] Developer ${doc.data().email || id} ${
        shouldSuspend ? 'SUSPENDED' : 'REINSTATED'
      }. Reason: ${updatePayload.suspensionReason || 'None'}`
    );

    res.json({
      message: shouldSuspend
        ? 'Developer account has been suspended. They can no longer upload products or broadcasts.'
        : 'Developer account has been reinstated successfully.',
      developer: {
        id,
        ...doc.data(),
        ...updatePayload,
      },
    });
  } catch (error) {
    console.error('Error updating developer suspension:', error);
    res.status(500).json({ message: 'Failed to update developer account suspension status.' });
  }
};

// @desc    Get public developer profile and all their published products
// @route   GET /api/developers/profile/:username
// @access  Public
const getPublicDeveloperProfile = async (req, res) => {
  try {
    const rawUsername = (req.params.username || '').trim();
    if (!rawUsername) {
      return res.status(400).json({ message: 'Developer username is required.' });
    }

    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();
    if (cleanUsername.length < 2 || cleanUsername.length > 50 || !/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({ message: 'Invalid developer username format. Must be alphanumeric with underscores or dots.' });
    }

    // Special Case: Official Upper Store Catalog Creator
    if (['upperstore', 'upper-store', 'upper_store', 'upper-admin', 'admin'].includes(cleanUsername)) {
      const prodSnap = await db.collection('products').get();
      const officialProducts = prodSnap.docs
        .map((doc) => {
          const data = doc.data();
          const downloadCount = Number(data.downloadCount ?? data.downloadsCount ?? data.downloads ?? 0);
          return { id: doc.id, ...data, downloadCount };
        })
        .filter((p) => p.isStoreOfficial || !p.developerId || !p.isDeveloperProduct);

      const totalDownloads = officialProducts.reduce(
        (sum, p) => sum + (Number(p.downloadCount) || 0),
        0
      );
      const avgRating =
        officialProducts.length > 0
          ? (
              officialProducts.reduce((sum, p) => sum + (Number(p.rating) || 5), 0) / officialProducts.length
            ).toFixed(1)
          : '5.0';

      const officialDoc = await db.collection('system_settings').doc('official_profile').get();
      const officialData = officialDoc.exists ? officialDoc.data() : {};

      // Real followers and following counts for Upper Store
      let followersCount = 0;
      let followingCount = 0;
      let isFollowing = false;

      try {
        const followersCountSnap = await db.collection('developer_follows')
          .where('developerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial'])
          .count()
          .get();
        followersCount = followersCountSnap.data().count || 0;

        const followingCountSnap = await db.collection('developer_follows')
          .where('followerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial'])
          .count()
          .get();
        followingCount = followingCountSnap.data().count || 0;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret());
            const reqUid = decoded.uid || decoded.id || decoded.userId;
            if (reqUid) {
              const officialDocKeys = [
                `${reqUid}_upperstore`,
                `${reqUid}_upperofficial`,
                `${reqUid}_upper-store`,
                `${reqUid}_upper_store`,
                `${reqUid}_GOhjkTTW9ZPqPS9I7Oa1`,
              ];
              for (const key of officialDocKeys) {
                const followDoc = await db.collection('developer_follows').doc(key).get();
                if (followDoc.exists) {
                  isFollowing = true;
                  break;
                }
              }
            }
          } catch (_) {}
        }
      } catch (fErr) {
        console.warn('Error fetching upperstore follow counts:', fErr.message);
      }

      return res.json({
        developer: {
          id: 'upper-store-official',
          userId: 'GOhjkTTW9ZPqPS9I7Oa1',
          username: 'upperstore',
          displayName: officialData.displayName || 'Upper Store Official',
          bio: (officialData.bio && officialData.bio.trim()) ? officialData.bio : 'None',
          avatar: officialData.avatar || '/logo.png',
          coverImage: officialData.coverImage || officialData.banner || '',
          banner: officialData.coverImage || officialData.banner || '',
          bannerPosY: officialData.bannerPosY !== undefined ? officialData.bannerPosY : 50,
          bannerZoom: officialData.bannerZoom !== undefined ? officialData.bannerZoom : 1.0,
          bannerFit: officialData.bannerFit || 'cover',
          location: officialData.location || 'None',
          vipPlan: 'official', // Conic Emerald Green Official Ring
          isVerified: true,
          isOfficial: true,
          isDeveloper: true,
          isSuspended: false,
          joinedAt: officialData.joinedAt || 'January 2026',
          followersCount,
          followingCount,
          isFollowing,
        },
        stats: {
          productsCount: officialProducts.length,
          totalDownloads,
          averageRating: Number(avgRating),
          followersCount,
          followingCount,
        },
        products: officialProducts,
      });
    }

    // 1. Locate developer in 'developers' or 'users' collection
    let devDoc = null;
    let devData = null;
    let userDoc = null;
    let userData = null;

    // Check 'developers' collection by username
    const devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
    if (!devSnap.empty) {
      devDoc = devSnap.docs[0];
      devData = devDoc.data();
      if (devData.userId) {
        const uDoc = await db.collection('users').doc(devData.userId).get();
        if (uDoc.exists) {
          userDoc = uDoc;
          userData = uDoc.data();
        }
      }
      if (!userData && devData.email) {
        const uSnap = await db.collection('users').where('email', '==', devData.email.toLowerCase()).limit(1).get();
        if (!uSnap.empty) {
          userDoc = uSnap.docs[0];
          userData = uSnap.docs[0].data();
        }
      }
    } else {
      // Check in 'users' collection by username
      const userSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
      if (!userSnap.empty) {
        userDoc = userSnap.docs[0];
        userData = userDoc.data();
      } else {
        // Fallback: check if username matches email handle prefix (e.g. handle before '@')
        const emailSnap = await db.collection('users')
          .where('email', '>=', cleanUsername + '@')
          .where('email', '<=', cleanUsername + '@\uf8ff')
          .limit(1)
          .get();
        if (!emailSnap.empty) {
          userDoc = emailSnap.docs[0];
          userData = userDoc.data();
        }
      }

      if (userDoc && userData) {
        let dSnap = await db.collection('developers').where('userId', '==', userDoc.id).limit(1).get();
        if (dSnap.empty && userData.email) {
          dSnap = await db.collection('developers').where('email', '==', userData.email.toLowerCase()).limit(1).get();
        }

        if (!dSnap.empty) {
          devDoc = dSnap.docs[0];
          devData = dSnap.docs[0].data();
        }
      }
    }

    // 2. Query published products (if any)
    let matchedProducts = [];
    try {
      const prodSnap = await db.collection('products').get();
      const allProds = prodSnap.docs.map((d) => {
        const data = d.data();
        const downloadCount = Number(data.downloadCount ?? data.downloadsCount ?? data.downloads ?? 0);
        return { id: d.id, ...data, downloadCount };
      });

      const devEmail = (devData?.email || userData?.email || '').toLowerCase();
      const devUid = devData?.userId || userDoc?.id || '';

      matchedProducts = allProds.filter(
        (p) =>
          (p.developerUsername && p.developerUsername.toLowerCase() === cleanUsername) ||
          (devEmail && p.developerEmail && p.developerEmail.toLowerCase() === devEmail) ||
          (devUid && p.developerId && p.developerId === devUid)
      );

      // If neither devDoc nor userDoc found, but products exist with this developerUsername
      if (!devData && !userData && matchedProducts.length > 0) {
        const sample = matchedProducts[0];
        devData = {
          username: cleanUsername,
          displayName: sample.developerName || cleanUsername,
          bio: '',
          avatar: sample.developerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanUsername)}`,
          vipPlan: sample.developerTier || 'pro',
          isSuspended: false,
          createdAt: sample.createdAt || new Date().toISOString(),
        };
      }
    } catch (pErr) {
      console.warn('Error fetching products for public developer profile:', pErr.message);
    }

    if (!devData && !userData) {
      return res.status(404).json({ message: `User @${cleanUsername} was not found on Upper Store.` });
    }

    // 3. Determine Developer Status & Subscription Expiration
    const isDeveloper = Boolean(devDoc || (userData && userData.isDeveloper) || matchedProducts.length > 0);
    const membership = userData?.membership || null;
    const validUntil = membership?.validUntil || null;
    const isExpiredByDate = Boolean(validUntil && new Date(validUntil) < new Date());
    const isCancelled = Boolean(
      membership?.isCancelled ||
      (userData?.vipCancelledAt && (!userData?.lastSubscribedAt || new Date(userData.vipCancelledAt) >= new Date(userData.lastSubscribedAt)) && membership?.plan === 'free')
    );

    let isVipActive = false;
    let subscriptionEnded = false;
    let currentVipPlan = 'free';

    // A creator only gets premium rings and tags if their VIP subscription is valid, active, non-expired, and non-cancelled
    if (membership && (membership.plan === 'pro' || membership.plan === 'elite') && !isExpiredByDate && !isCancelled) {
      isVipActive = true;
      subscriptionEnded = false;
      currentVipPlan = membership.plan;

      // Auto-heal developer doc if it had stale vipPlan: 'free' or subscriptionEnded: true
      if (devDoc && (devData?.vipPlan !== currentVipPlan || !devData?.isVipActive || devData?.subscriptionEnded || devData?.cancelledAt)) {
        devDoc.ref.update({
          vipPlan: currentVipPlan,
          isVipActive: true,
          subscriptionEnded: false,
          cancelledAt: null,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } else if (devData && (devData.vipPlan === 'pro' || devData.vipPlan === 'elite') && !devData.subscriptionEnded && !devData.cancelledAt) {
      // Developer record itself is marked active VIP
      isVipActive = true;
      subscriptionEnded = false;
      currentVipPlan = devData.vipPlan;
    } else {
      // Free tier, expired, cancelled, or deleted
      subscriptionEnded = true;
      isVipActive = false;
      currentVipPlan = 'free';

      if (devDoc && devData?.vipPlan && devData.vipPlan !== 'free') {
        devDoc.ref.update({
          vipPlan: 'free',
          isVipActive: false,
          subscriptionEnded: true,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    // 4. Compute dynamic stats and real reviews from database
    const totalDownloads = matchedProducts.reduce(
      (sum, p) => sum + (Number(p.downloadCount) || 0),
      0
    );

    // Fetch real reviews from 'reviews' collection for developer products
    const productIds = matchedProducts.map((p) => p.id).filter(Boolean);
    let totalReviewsCount = 0;
    let totalReviewRatingSum = 0;
    const productReviewStats = {};

    if (productIds.length > 0) {
      try {
        const chunks = [];
        for (let i = 0; i < productIds.length; i += 30) {
          chunks.push(productIds.slice(i, i + 30));
        }
        for (const chunk of chunks) {
          const revSnap = await db.collection('reviews').where('productId', 'in', chunk).get();
          revSnap.docs.forEach((doc) => {
            const r = doc.data();
            const num = Number(r.rating);
            if (!isNaN(num) && num >= 1 && num <= 5) {
              totalReviewRatingSum += num;
              totalReviewsCount++;
              if (!productReviewStats[r.productId]) {
                productReviewStats[r.productId] = { sum: 0, count: 0 };
              }
              productReviewStats[r.productId].sum += num;
              productReviewStats[r.productId].count++;
            }
          });
        }
      } catch (revErr) {
        console.warn('Error fetching real reviews for developer products:', revErr.message);
      }
    }

    // Attach real rating and review counts to each matched product
    matchedProducts = matchedProducts.map((p) => {
      const stats = productReviewStats[p.id];
      const pAvg = stats && stats.count > 0 ? Number((stats.sum / stats.count).toFixed(1)) : 5.0;
      const pCount = stats ? stats.count : 0;
      return {
        ...p,
        averageRating: pAvg,
        reviewsCount: pCount,
      };
    });

    const avgRating = totalReviewsCount > 0
      ? Number((totalReviewRatingSum / totalReviewsCount).toFixed(1))
      : (matchedProducts.length > 0 ? 5.0 : 0.0);

    // Real Followers and Following Counts from 'developer_follows' collection (O(1) server-side index count)
    let followersCount = 0;
    let followingCount = 0;
    let isFollowing = false;

    try {
      const canonicalUsername = (devData?.username || userData?.username || cleanUsername).toLowerCase().trim();
      const devTargetUid = devData?.userId || userDoc?.id || null;

      const followersCountSnap = await db.collection('developer_follows').where('developerUsername', '==', canonicalUsername).count().get();
      followersCount = followersCountSnap.data().count || 0;

      if (followersCount === 0 && cleanUsername !== canonicalUsername) {
        try {
          const fallbackSnap = await db.collection('developer_follows').where('developerUsername', '==', cleanUsername).count().get();
          if ((fallbackSnap.data().count || 0) > 0) {
            followersCount = fallbackSnap.data().count;
          }
        } catch (_) {}
      }

      if (devTargetUid) {
        const followingCountSnap = await db.collection('developer_follows').where('followerId', '==', devTargetUid).count().get();
        followingCount = followingCountSnap.data().count || 0;
      }

      // Check if requesting user is following (if auth token provided)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, getJwtSecret());
          const reqUid = decoded.uid || decoded.id || decoded.userId;
          if (reqUid) {
            const keysToCheck = [
              `${reqUid}_${cleanUsername}`,
              `${reqUid}_${canonicalUsername}`,
            ];
            if (devTargetUid) {
              keysToCheck.push(`${reqUid}_${devTargetUid}`);
            }
            for (const docKey of [...new Set(keysToCheck)]) {
              const followDoc = await db.collection('developer_follows').doc(docKey).get();
              if (followDoc.exists) {
                isFollowing = true;
                break;
              }
            }
            if (!isFollowing && devTargetUid) {
              const qSnap = await db.collection('developer_follows')
                .where('followerId', '==', reqUid)
                .where('developerUserId', '==', devTargetUid)
                .limit(1)
                .get();
              if (!qSnap.empty) {
                isFollowing = true;
              }
            }
          }
        } catch (_) {}
      }
    } catch (fErr) {
      console.warn('Error fetching developer follow counts:', fErr.message);
    }

    // 5. Safe Public Profile (Zero exposure of private Aadhaar, phone, or email)
    const publicProfile = {
      id: devDoc ? devDoc.id : userDoc ? userDoc.id : cleanUsername,
      userId: devData?.userId || userDoc?.id || null,
      username: devData?.username || userData?.username || cleanUsername,
      displayName: devData?.displayName || userData?.displayName || userData?.username || cleanUsername,
      bio: (() => {
        const raw = (devData?.bio && devData.bio.trim()) || (userData?.bio && userData.bio.trim()) || '';
        const isLegacy =
          raw === 'Verified Upper Store Creator. Building high-performance software and developer tools.' ||
          raw === 'Upper Store Community Member.' ||
          raw === 'Verified Upper Store creator crafting high-performance tools and applications.' ||
          raw === 'Upper Store Community Member exploring verified developer releases and utilities.' ||
          raw === 'No bio';
        return !raw || isLegacy ? 'None' : raw;
      })(),
      avatar: devData?.avatar || userData?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanUsername)}`,
      vipPlan: currentVipPlan, // Determines the avatar ring! 'elite', 'pro', or 'free'
      previousVipPlan: membership?.plan || devData?.vipPlan || null,
      isDeveloper: isDeveloper,
      isVipActive: isVipActive,
      subscriptionEnded: subscriptionEnded,
      isVerified: isDeveloper && !devData?.isSuspended,
      isSuspended: Boolean(devData?.isSuspended || userData?.isBanned),
      coverImage: devData?.coverImage || devData?.banner || userData?.coverImage || userData?.banner || '',
      banner: devData?.banner || devData?.coverImage || userData?.banner || userData?.coverImage || '',
      location: (devData?.location && devData.location.trim()) || (userData?.location && userData.location.trim()) || 'None',
      locationLocked: Boolean(
        (userData?.location && userData.location.trim().toLowerCase() !== 'none') ||
        (devData?.location && devData.location.trim().toLowerCase() !== 'none') ||
        userData?.locationLocked ||
        devData?.locationLocked
      ),
      joinedAt: formatExactMonthYear(
        devData?.joinedAt ||
        userData?.developerJoinedAt ||
        devData?.createdAt ||
        devDoc?.createTime?.toDate() ||
        userData?.joinedAt ||
        userData?.createdAt ||
        userDoc?.createTime?.toDate() ||
        new Date()
      ),
      createdAt: devData?.createdAt || userData?.createdAt || null,
      followersCount,
      followingCount,
      isFollowing,
    };

    // Auto-sync products developerTier to match current active VIP tier
    if (isVipActive && matchedProducts.some((p) => p.developerTier !== currentVipPlan)) {
      matchedProducts.forEach((p) => {
        if (p.id && p.developerTier !== currentVipPlan) {
          db.collection('products').doc(p.id).update({
            developerTier: currentVipPlan,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      });
      try {
        const cacheService = require('../services/cacheService');
        cacheService.invalidate('products_list');
        const { invalidateSearchCache } = require('../services/searchService');
        invalidateSearchCache();
      } catch (_) {}
    }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=120');
    res.json({
      developer: publicProfile,
      stats: {
        productsCount: matchedProducts.length,
        totalDownloads,
        averageRating: Number(avgRating),
        totalReviews: totalReviewsCount,
        followersCount,
        followingCount,
      },
      products: matchedProducts.map((p) => {
        const safe = { ...p };
        delete safe.developerEmail;
        if (isVipActive) {
          safe.developerTier = currentVipPlan;
        } else if (subscriptionEnded) {
          safe.developerTier = 'free';
        }
        return safe;
      }),
    });
  } catch (error) {
    console.error('Error fetching public developer profile:', error);
    res.status(500).json({ message: 'Failed to retrieve developer profile.' });
  }
};

// @desc    Update authenticated developer's bio
// @route   PUT /api/developers/bio
// @access  Private (Authenticated User)
const updateDeveloperBio = async (req, res) => {
  try {
    const { bio } = req.body;
    const userId = req.user.uid;
    const cleanEmail = (req.user.email || '').trim().toLowerCase();

    const cleanBio = (bio || '').trim().slice(0, 500) || 'None';

    // Update in developers collection
    let devSnap = await db.collection('developers').where('userId', '==', userId).limit(1).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }

    if (!devSnap.empty) {
      await devSnap.docs[0].ref.update({
        bio: cleanBio,
        updatedAt: new Date().toISOString(),
      });
    }

    // Also update in users collection
    try {
      await db.collection('users').doc(userId).update({
        bio: cleanBio,
        updatedAt: new Date().toISOString(),
      });
    } catch (uErr) {
      // Non-critical
    }

    invalidateSearchCache();

    res.json({
      message: 'Developer bio updated successfully.',
      bio: cleanBio,
    });
  } catch (error) {
    console.error('Error updating developer bio:', error);
    res.status(500).json({ message: 'Failed to update developer bio.' });
  }
};


// @desc    Get Upper Store Official Profile
// @route   GET /api/developers/official/profile
// @access  Public
const getOfficialProfile = async (req, res) => {
  try {
    const officialDoc = await db.collection('system_settings').doc('official_profile').get();
    const officialData = officialDoc.exists ? officialDoc.data() : {};

    return res.json({
      developer: {
        id: 'upper-store-official',
        username: 'upperstore',
        displayName: officialData.displayName || 'Upper Store Official',
        bio: (officialData.bio && officialData.bio.trim()) ? officialData.bio : 'None',
        avatar: officialData.avatar || '/logo.png',
        coverImage: officialData.coverImage || officialData.banner || '',
        banner: officialData.coverImage || officialData.banner || '',
        bannerPosY: officialData.bannerPosY !== undefined ? officialData.bannerPosY : 50,
        bannerZoom: officialData.bannerZoom !== undefined ? officialData.bannerZoom : 1.0,
        bannerFit: officialData.bannerFit || 'cover',
        location: officialData.location || 'None',
        vipPlan: 'official', // Conic Emerald Green Official Ring
        isVerified: true,
        isOfficial: true,
        isDeveloper: true,
        updatedAt: officialData.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Get official profile error:', error);
    return res.status(500).json({ message: 'Failed to fetch official profile.' });
  }
};

// @desc    Update Upper Store Official Profile details & cover
// @route   PUT /api/developers/official/profile
// @access  Private (Admin or Authorized Owner)
const updateOfficialProfile = async (req, res) => {
  try {
    if (!isOfficialAuthorized(req)) {
      return res.status(403).json({ message: 'Forbidden: Only Upper Store administrators can edit the official profile.' });
    }

    const { displayName, bio, coverImage, banner, location, bannerPosY, bannerZoom, bannerFit } = req.body;
    const updates = {
      updatedAt: new Date().toISOString(),
    };
    if (displayName) updates.displayName = String(displayName).slice(0, 60);
    if (bio !== undefined) updates.bio = String(bio).slice(0, 500);
    if (location !== undefined) updates.location = String(location).slice(0, 80);
    if (bannerPosY !== undefined) updates.bannerPosY = Math.max(0, Math.min(100, Number(bannerPosY)));
    if (bannerZoom !== undefined) updates.bannerZoom = Math.max(1.0, Math.min(2.5, Number(bannerZoom)));
    if (bannerFit !== undefined && ['cover', 'contain'].includes(bannerFit)) updates.bannerFit = bannerFit;
    const rawCover = coverImage !== undefined ? coverImage : banner;
    if (rawCover !== undefined) {
      updates.coverImage = String(rawCover).trim();
      updates.banner = String(rawCover).trim();
    }

    const docRef = db.collection('system_settings').doc('official_profile');
    await docRef.set(updates, { merge: true });

    const snap = await docRef.get();
    invalidateSearchCache();
    return res.json({
      message: 'Upper Store Official profile updated successfully.',
      developer: {
        id: 'upper-store-official',
        username: 'upperstore',
        vipPlan: 'official',
        ...snap.data(),
        isOfficial: true,
        isDeveloper: true,
      },
    });
  } catch (error) {
    console.error('Update official profile error:', error);
    return res.status(500).json({ message: 'Failed to update official profile.' });
  }
};

// @desc    Upload Upper Store Official cover banner directly to ImageKit CDN
// @route   POST /api/developers/official/cover-image
// @access  Private (Admin or Authorized Owner)
const uploadOfficialCoverImage = async (req, res) => {
  try {
    if (!isOfficialAuthorized(req)) {
      return res.status(403).json({ message: 'Forbidden: Only Upper Store administrators can upload official banners.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(req.file.mimetype.toLowerCase())) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ message: 'Invalid file format. Only JPG, PNG, WEBP, and GIF images are allowed.' });
    }

    const cdnUrl = await uploadFileToCloudOrLocal(req.file, 'banners', req);
    if (!cdnUrl) {
      return res.status(500).json({ message: 'Failed to upload background image to ImageKit.' });
    }

    const docRef = db.collection('system_settings').doc('official_profile');
    await docRef.set({
      coverImage: cdnUrl,
      banner: cdnUrl,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return res.json({
      message: 'Official background image uploaded successfully to ImageKit CDN.',
      coverImage: cdnUrl,
      banner: cdnUrl,
    });
  } catch (error) {
    console.error('Upload official cover image error:', error);
    return res.status(500).json({ message: 'Server error while uploading official background image.' });
  }
};

// @desc    Remove Upper Store Official cover banner
// @route   DELETE /api/developers/official/cover-image
// @access  Private (Admin or Authorized Owner)
const removeOfficialCoverImage = async (req, res) => {
  try {
    if (!isOfficialAuthorized(req)) {
      return res.status(403).json({ message: 'Forbidden: Only Upper Store administrators can edit official profile.' });
    }

    const docRef = db.collection('system_settings').doc('official_profile');
    await docRef.set({
      coverImage: '',
      banner: '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return res.json({
      message: 'Official background image removed successfully.',
      coverImage: '',
      banner: '',
    });
  } catch (error) {
    console.error('Remove official cover error:', error);
    return res.status(500).json({ message: 'Server error while removing official background image.' });
  }
};


// In-memory concurrency locks to prevent server freeze from rapid spam/burst follow requests
const activeFollowLocks = new Set();

// Helper to determine VIP ring plan for a user/developer record
const computeVipRingPlan = (userData = {}, devData = {}) => {
  const membership = userData.membership || devData.membership || null;
  const validUntil = membership?.validUntil || null;
  const isExpired = Boolean(validUntil && new Date(validUntil) < new Date());
  const isCancelled = Boolean(membership?.isCancelled);

  if (membership && (membership.plan === 'elite' || membership.plan === 'pro') && !isExpired && !isCancelled) {
    return membership.plan;
  }
  if (devData.vipPlan === 'elite' || devData.vipPlan === 'pro') {
    if (!devData.subscriptionEnded && !devData.isSuspended) {
      return devData.vipPlan;
    }
  }
  const handle = (userData.username || devData.username || '').toLowerCase();
  if (devData.isOfficial || devData.vipPlan === 'official' || ['upperstore', 'upper-store', 'upper_store'].includes(handle)) {
    return 'official';
  }
  return 'free';
};

// @desc    Toggle follow / unfollow developer
// @route   POST /api/developers/follow/:username
// @access  Private (Authenticated User)
const toggleFollowDeveloper = async (req, res) => {
  const followerId = req.user?.uid;
  const rawUsername = (req.params.username || '').trim();
  const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();

  if (!followerId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!cleanUsername) {
    return res.status(400).json({ message: 'Developer username is required.' });
  }

  // Non-blocking concurrency lock to eliminate double-clicks and server freeze under concurrent spam
  const lockKey = `${followerId}_${cleanUsername}`;
  if (activeFollowLocks.has(lockKey)) {
    return res.status(429).json({
      success: false,
      message: 'Follow request already processing. Please wait a moment.',
    });
  }
  activeFollowLocks.add(lockKey);

  try {
    // Locate target developer and resolve canonical username
    let targetUserId = null;
    let targetEmail = null;
    let canonicalUsername = cleanUsername;
    const isOfficialTarget = ['upperstore', 'upper-store', 'upper_store', 'upper-admin', 'admin'].includes(cleanUsername);
    let devSnap = { empty: true, docs: [] };

    if (isOfficialTarget) {
      targetUserId = 'GOhjkTTW9ZPqPS9I7Oa1';
      targetEmail = 'upper.official.in@gmail.com';
      canonicalUsername = 'upperstore';
    } else {
      devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
      if (!devSnap.empty) {
        const d = devSnap.docs[0].data();
        targetUserId = d.userId;
        targetEmail = d.email || null;
        if (d.username) canonicalUsername = d.username.toLowerCase().trim();
      } else {
        const uSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
        if (!uSnap.empty) {
          const u = uSnap.docs[0].data();
          targetUserId = uSnap.docs[0].id;
          targetEmail = u.email || null;
          if (u.username) canonicalUsername = u.username.toLowerCase().trim();
        } else {
          // Fallback: check by email prefix (e.g. handle before '@')
          const emailSnap = await db.collection('users')
            .where('email', '>=', cleanUsername + '@')
            .where('email', '<=', cleanUsername + '@\uf8ff')
            .limit(1)
            .get();
          if (!emailSnap.empty) {
            targetUserId = emailSnap.docs[0].id;
            targetEmail = emailSnap.docs[0].data().email || null;
            if (emailSnap.docs[0].data().username) {
              canonicalUsername = emailSnap.docs[0].data().username.toLowerCase().trim();
            }
          }
        }
      }
    }

    if (targetUserId && !targetEmail) {
      try {
        const uDoc = await db.collection('users').doc(targetUserId).get();
        if (uDoc.exists) targetEmail = uDoc.data().email || null;
      } catch (_) {}
    }

    if (targetUserId && (targetUserId === followerId || (req.user?.email && targetEmail && req.user.email.toLowerCase().trim() === targetEmail.toLowerCase().trim()))) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    // Fetch follower user & dev data for profile picture & VIP ring
    let followerUserData = {};
    let followerDevData = {};
    try {
      const uDoc = await db.collection('users').doc(followerId).get();
      if (uDoc.exists) followerUserData = uDoc.data();
      const dSnap = await db.collection('developers').where('userId', '==', followerId).limit(1).get();
      if (!dSnap.empty) followerDevData = dSnap.docs[0].data();
    } catch (_) {}

    const followerUsername = followerUserData.username || followerDevData.username || req.user.username || (req.user.email ? req.user.email.split('@')[0] : 'user');
    const cleanFollowerUsername = followerUsername.toLowerCase().trim();
    const followerDisplayName = followerDevData.displayName || followerUserData.displayName || req.user.displayName || req.user.name || followerUsername;
    const followerAvatar = followerDevData.avatar || followerUserData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanFollowerUsername)}`;
    const followerVipTier = computeVipRingPlan(followerUserData, followerDevData);

    // Collect all potential document keys representing this follow relationship
    const docKeysToCheck = [
      `${followerId}_${cleanUsername}`,
      `${followerId}_${canonicalUsername}`,
    ];
    if (targetUserId) {
      docKeysToCheck.push(`${followerId}_${targetUserId}`);
    }
    if (isOfficialTarget) {
      docKeysToCheck.push(
        `${followerId}_upperstore`,
        `${followerId}_upperofficial`,
        `${followerId}_upper-store`,
        `${followerId}_upper_store`,
        `${followerId}_GOhjkTTW9ZPqPS9I7Oa1`
      );
    }

    const matchedFollowDocRefs = [];
    for (const key of [...new Set(docKeysToCheck)]) {
      const ref = db.collection('developer_follows').doc(key);
      const snap = await ref.get();
      if (snap.exists) {
        matchedFollowDocRefs.push(ref);
      }
    }
    const alreadyFollowing = matchedFollowDocRefs.length > 0;

    const requestedAction = req.body?.action; // Explicit 'follow' or 'unfollow'
    const isUnfollow = requestedAction === 'unfollow' || req.method === 'DELETE' || (requestedAction !== 'follow' && alreadyFollowing);
    let nextIsFollowing = false;

    if (isUnfollow) {
      // Remove all matched follow documents to eliminate stale duplicates
      for (const ref of matchedFollowDocRefs) {
        await ref.delete().catch(() => {});
      }
      nextIsFollowing = false;

      // Delete any follow notifications from this follower to this developer
      try {
        const notifQuery = await db.collection('notifications')
          .where('type', '==', 'follow')
          .where('authorUsername', '==', cleanFollowerUsername)
          .get();
        for (const doc of notifQuery.docs) {
          const nData = doc.data();
          if (
            nData.targetUsername === cleanUsername ||
            nData.targetUsername === canonicalUsername ||
            (targetUserId && nData.targetUserId === targetUserId)
          ) {
            await doc.ref.delete().catch(() => {});
          }
        }
      } catch (_) {}
    } else {
      const followData = {
        followerId,
        followerUsername: cleanFollowerUsername,
        followerEmail: (req.user.email || followerUserData.email || '').toLowerCase().trim(),
        followerName: followerDisplayName,
        developerUsername: canonicalUsername,
        developerUserId: targetUserId || null,
        createdAt: new Date().toISOString(),
      };

      // Always write canonical key and cleanUsername key to guarantee instant resolution across all routes
      const primaryDocRef = db.collection('developer_follows').doc(`${followerId}_${canonicalUsername}`);
      await primaryDocRef.set(followData, { merge: true });

      if (cleanUsername !== canonicalUsername) {
        await db.collection('developer_follows').doc(`${followerId}_${cleanUsername}`).set(followData, { merge: true }).catch(() => {});
      }
      if (isOfficialTarget) {
        await db.collection('developer_follows').doc(`${followerId}_upperstore`).set(followData, { merge: true }).catch(() => {});
      }

      nextIsFollowing = true;

      // Create notification for target developer (if not following self)
      if (targetUserId !== followerId) {
        try {
          const existingNotifs = await db.collection('notifications')
            .where('type', '==', 'follow')
            .where('authorUsername', '==', cleanFollowerUsername)
            .limit(1)
            .get();

          let matchedNotif = null;
          for (const doc of existingNotifs.docs) {
            const nd = doc.data();
            if (nd.targetUsername === cleanUsername || nd.targetUsername === canonicalUsername || (targetUserId && nd.targetUserId === targetUserId)) {
              matchedNotif = doc;
              break;
            }
          }

          if (!matchedNotif) {
            await db.collection('notifications').add({
              title: 'New Follower',
              message: `@${cleanFollowerUsername} started following you.`,
              category: 'Follower',
              authorName: followerDisplayName,
              authorUsername: cleanFollowerUsername,
              authorAvatar: followerAvatar,
              authorTier: followerVipTier,
              targetEmail: targetEmail ? targetEmail.toLowerCase().trim() : null,
              targetUserId: targetUserId || null,
              targetUsername: canonicalUsername,
              link: `/developer/${cleanFollowerUsername}`,
              type: 'follow',
              createdAt: new Date().toISOString(),
            });
          } else {
            await matchedNotif.ref.update({
              createdAt: new Date().toISOString(),
              authorName: followerDisplayName,
              authorAvatar: followerAvatar,
              authorTier: followerVipTier,
              targetEmail: targetEmail ? targetEmail.toLowerCase().trim() : null,
              targetUserId: targetUserId || null,
              targetUsername: canonicalUsername,
              message: `@${cleanFollowerUsername} started following you.`,
            }).catch(() => {});
          }
        } catch (notifErr) {
          console.warn('Failed to dispatch follow notification:', notifErr.message);
        }
      }
    }

    // Recount real followers
    let followersCount = 0;
    if (isOfficialTarget) {
      const countSnap = await db.collection('developer_follows')
        .where('developerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial'])
        .count()
        .get();
      followersCount = countSnap.data().count || 0;
    } else {
      const countSnap = await db.collection('developer_follows').where('developerUsername', '==', canonicalUsername).count().get();
      followersCount = countSnap.data().count || 0;
      if (followersCount === 0 && cleanUsername !== canonicalUsername) {
        try {
          const fallbackSnap = await db.collection('developer_follows').where('developerUsername', '==', cleanUsername).count().get();
          if ((fallbackSnap.data().count || 0) > 0) followersCount = fallbackSnap.data().count;
        } catch (_) {}
      }
    }

    // Persist followersCount to developer and user records
    if (!devSnap.empty) {
      devSnap.docs[0].ref.update({
        followersCount,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    } else if (targetUserId) {
      db.collection('developers').where('userId', '==', targetUserId).limit(1).get().then((snap) => {
        if (!snap.empty) {
          snap.docs[0].ref.update({ followersCount, updatedAt: new Date().toISOString() }).catch(() => {});
        }
      }).catch(() => {});
    }

    if (targetUserId) {
      db.collection('users').doc(targetUserId).update({
        followersCount,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    if (isOfficialTarget) {
      db.collection('developers').where('username', 'in', ['upperstore', 'upperofficial', 'upper-store']).limit(1).get().then((snap) => {
        if (!snap.empty) {
          snap.docs[0].ref.update({ followersCount, updatedAt: new Date().toISOString() }).catch(() => {});
        }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      isFollowing: nextIsFollowing,
      followersCount,
      message: nextIsFollowing ? `Now following @${cleanUsername}` : `Unfollowed @${cleanUsername}`,
    });
  } catch (error) {
    console.error('Error toggling developer follow:', error);
    return res.status(500).json({ message: 'Failed to update follow status.' });
  } finally {
    activeFollowLocks.delete(lockKey);
  }
};

// @desc    Get follow status for current user
// @route   GET /api/developers/follow-status/:username
// @access  Private (Authenticated User)
const getFollowStatus = async (req, res) => {
  try {
    const followerId = req.user?.uid;
    const rawUsername = (req.params.username || '').trim();
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const isOfficialTarget = ['upperstore', 'upper-store', 'upper_store', 'upper-admin', 'admin'].includes(cleanUsername);
    let targetUserId = null;
    let canonicalUsername = cleanUsername;

    if (isOfficialTarget) {
      targetUserId = 'GOhjkTTW9ZPqPS9I7Oa1';
      canonicalUsername = 'upperstore';
    } else {
      const devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
      if (!devSnap.empty) {
        const d = devSnap.docs[0].data();
        targetUserId = d.userId;
        if (d.username) canonicalUsername = d.username.toLowerCase().trim();
      } else {
        const uSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
        if (!uSnap.empty) {
          const u = uSnap.docs[0].data();
          targetUserId = uSnap.docs[0].id;
          if (u.username) canonicalUsername = u.username.toLowerCase().trim();
        }
      }
    }

    let isFollowing = false;
    if (followerId) {
      const keysToCheck = [
        `${followerId}_${cleanUsername}`,
        `${followerId}_${canonicalUsername}`,
      ];
      if (targetUserId) {
        keysToCheck.push(`${followerId}_${targetUserId}`);
      }
      if (isOfficialTarget) {
        keysToCheck.push(
          `${followerId}_upperstore`,
          `${followerId}_upperofficial`,
          `${followerId}_upper-store`,
          `${followerId}_upper_store`,
          `${followerId}_GOhjkTTW9ZPqPS9I7Oa1`
        );
      }

      for (const key of [...new Set(keysToCheck)]) {
        const doc = await db.collection('developer_follows').doc(key).get();
        if (doc.exists) {
          isFollowing = true;
          break;
        }
      }

      if (!isFollowing && targetUserId) {
        const qSnap = await db.collection('developer_follows')
          .where('followerId', '==', followerId)
          .where('developerUserId', '==', targetUserId)
          .limit(1)
          .get();
        if (!qSnap.empty) {
          isFollowing = true;
        }
      }
    }

    let followersCount = 0;
    if (isOfficialTarget) {
      const countSnap = await db.collection('developer_follows')
        .where('developerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial'])
        .count()
        .get();
      followersCount = countSnap.data().count || 0;
    } else {
      const countSnap = await db.collection('developer_follows').where('developerUsername', '==', canonicalUsername).count().get();
      followersCount = countSnap.data().count || 0;
      if (followersCount === 0 && cleanUsername !== canonicalUsername) {
        try {
          const fallbackSnap = await db.collection('developer_follows').where('developerUsername', '==', cleanUsername).count().get();
          if ((fallbackSnap.data().count || 0) > 0) followersCount = fallbackSnap.data().count;
        } catch (_) {}
      }
    }

    return res.json({
      success: true,
      isFollowing,
      followersCount,
    });
  } catch (error) {
    console.error('Error getting follow status:', error);
    return res.status(500).json({ message: 'Failed to get follow status.' });
  }
};

// @desc    Get real followers list for a developer/user
// @route   GET /api/developers/:username/followers
// @access  Public
const getDeveloperFollowers = async (req, res) => {
  try {
    const rawUsername = (req.params.username || '').trim();
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const isOfficialTarget = ['upperstore', 'upper-store', 'upper_store', 'upper-admin', 'admin'].includes(cleanUsername);

    // 1. Fetch follower records (capped at 100 for safety and fast sub-100ms response)
    const followsQuery = isOfficialTarget
      ? db.collection('developer_follows').where('developerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial']).limit(100)
      : db.collection('developer_follows').where('developerUsername', '==', cleanUsername).limit(100);
    const followsSnap = await followsQuery.get();

    let totalCount = followsSnap.size;
    if (followsSnap.size === 100) {
      try {
        const countSnap = isOfficialTarget
          ? await db.collection('developer_follows').where('developerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial']).count().get()
          : await db.collection('developer_follows').where('developerUsername', '==', cleanUsername).count().get();
        totalCount = countSnap.data().count || followsSnap.size;
      } catch (_) {}
    }

    if (followsSnap.empty) {
      return res.json({
        success: true,
        count: totalCount,
        followers: [],
      });
    }

    const followDocs = followsSnap.docs.map((d) => d.data());
    const followerIds = [...new Set(followDocs.map((d) => d.followerId).filter(Boolean))];

    // 3. Batch fetch user documents for live profile picture & VIP ring calculation
    const userMap = {};
    if (followerIds.length > 0) {
      for (let i = 0; i < followerIds.length; i += 30) {
        const chunk = followerIds.slice(i, i + 30);
        const refs = chunk.map((id) => db.collection('users').doc(id));
        const snapshots = await db.getAll(...refs);
        snapshots.forEach((docSnap) => {
          if (docSnap.exists) {
            userMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
          }
        });
      }
    }

    // 4. Batch fetch developer docs (to know if they are verified developers / official house)
    const devMap = {};
    if (followerIds.length > 0) {
      for (let i = 0; i < followerIds.length; i += 30) {
        const chunk = followerIds.slice(i, i + 30);
        const devSnaps = await db.collection('developers').where('userId', 'in', chunk).get();
        devSnaps.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.userId) {
            devMap[d.userId] = { id: docSnap.id, ...d };
          }
        });
      }
    }

    // 5. Assemble enriched follower list
    // Strictly contains: avatar (with premium ring plan), clickable username, displayName.
    // Explicitly NO "pro VIP" or "Elite VIP" tags or badges.
    const enrichedFollowers = followDocs.map((f) => {
      const u = userMap[f.followerId] || {};
      const dev = devMap[f.followerId] || {};

      const username = u.username || dev.username || f.followerUsername || (f.followerName || 'user').toLowerCase().replace(/\s+/g, '');
      const displayName = dev.displayName || u.displayName || f.followerName || username;
      const avatar = dev.avatar || u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;
      const vipPlan = computeVipRingPlan(u, dev);

      return {
        id: f.followerId,
        username,
        displayName,
        avatar,
        vipPlan, // 'elite' | 'pro' | 'official' | 'free' (renders the glowing ring around avatar)
        followedAt: f.createdAt || null,
      };
    });

    return res.json({
      success: true,
      count: totalCount,
      followers: enrichedFollowers,
    });
  } catch (error) {
    console.error('Error fetching developer followers:', error);
    return res.status(500).json({ message: 'Failed to fetch followers list.' });
  }
};

// @desc    Get real following list for a developer/user
// @route   GET /api/developers/:username/following
// @access  Public
const getDeveloperFollowing = async (req, res) => {
  try {
    const rawUsername = (req.params.username || '').trim();
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    // 1. Locate the target user ID
    let targetUserId = null;
    const isOfficialTarget = ['upperstore', 'upper-store', 'upper_store', 'upper-admin', 'admin'].includes(cleanUsername);
    if (isOfficialTarget) {
      targetUserId = 'GOhjkTTW9ZPqPS9I7Oa1';
    } else {
      const devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
      if (!devSnap.empty) {
        targetUserId = devSnap.docs[0].data().userId;
      } else {
        const uSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
        if (!uSnap.empty) {
          targetUserId = uSnap.docs[0].id;
        }
      }
    }

    // 2. Query developer_follows (capped at 100)
    let followDocs = [];
    let totalCount = 0;

    if (targetUserId) {
      const followsSnap = await db.collection('developer_follows')
        .where('followerId', '==', targetUserId)
        .limit(100)
        .get();
      followDocs = followsSnap.docs.map((d) => d.data());
      totalCount = followsSnap.size;
      if (followsSnap.size === 100) {
        try {
          const countSnap = await db.collection('developer_follows')
            .where('followerId', '==', targetUserId)
            .count()
            .get();
          totalCount = countSnap.data().count || followsSnap.size;
        } catch (_) {}
      }
    } else {
      const followsSnap = await db.collection('developer_follows')
        .where('followerUsername', '==', cleanUsername)
        .limit(100)
        .get();
      followDocs = followsSnap.docs.map((d) => d.data());
      totalCount = followsSnap.size;
      if (followsSnap.size === 100) {
        try {
          const countSnap = await db.collection('developer_follows')
            .where('followerUsername', '==', cleanUsername)
            .count()
            .get();
          totalCount = countSnap.data().count || followsSnap.size;
        } catch (_) {}
      }
    }

    if (followDocs.length === 0) {
      return res.json({
        success: true,
        count: totalCount,
        following: [],
      });
    }

    const followedUsernames = [...new Set(followDocs.map((d) => d.developerUsername).filter(Boolean))];

    // 3. Batch fetch developer information for the followed accounts
    const devMap = {};
    if (followedUsernames.length > 0) {
      for (let i = 0; i < followedUsernames.length; i += 30) {
        const chunk = followedUsernames.slice(i, i + 30);
        const snaps = await db.collection('developers').where('username', 'in', chunk).get();
        snaps.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.username) {
            devMap[d.username.toLowerCase()] = { id: docSnap.id, ...d };
          }
        });
      }
    }

    // 4. Batch fetch users info if any followed accounts are not developers
    const missingUsernames = followedUsernames.filter((u) => !devMap[u.toLowerCase()]);
    const userMap = {};
    if (missingUsernames.length > 0) {
      for (let i = 0; i < missingUsernames.length; i += 30) {
        const chunk = missingUsernames.slice(i, i + 30);
        const uSnaps = await db.collection('users').where('username', 'in', chunk).get();
        uSnaps.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.username) {
            userMap[d.username.toLowerCase()] = { id: docSnap.id, ...d };
          }
        });
      }
    }

    // 5. Assemble enriched following list
    const enrichedFollowing = followDocs.map((f) => {
      const devHandle = (f.developerUsername || '').toLowerCase();
      const dev = devMap[devHandle] || {};
      const u = userMap[devHandle] || {};

      const username = dev.username || u.username || f.developerUsername;
      const displayName = dev.displayName || u.displayName || username;
      const avatar = dev.avatar || u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;
      const vipPlan = computeVipRingPlan(u, dev);

      return {
        id: dev.userId || dev.id || u.id || username,
        username,
        displayName,
        avatar,
        vipPlan, // 'elite' | 'pro' | 'official' | 'free' (renders the glowing ring around avatar)
        followedAt: f.createdAt || null,
      };
    });

    return res.json({
      success: true,
      count: totalCount,
      following: enrichedFollowing,
    });
  } catch (error) {
    console.error('Error fetching developer following:', error);
    return res.status(500).json({ message: 'Failed to fetch following list.' });
  }
};

// @desc    Remove a follower from a developer/user profile
// @route   DELETE /api/developers/:username/followers/:followerUsername
// @route   POST /api/developers/:username/followers/remove
// @access  Private (Authenticated User - Profile Owner or Admin)
const removeDeveloperFollower = async (req, res) => {
  const currentUserId = req.user?.uid;
  const rawUsername = (req.params.username || '').trim();
  const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();
  const rawFollowerUsername = (req.params.followerUsername || req.body?.followerUsername || '').trim();
  const cleanFollowerUsername = rawFollowerUsername.replace(/^@/, '').trim().toLowerCase();
  const followerId = (req.body?.followerId || '').trim();

  if (!currentUserId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!cleanUsername || (!cleanFollowerUsername && !followerId)) {
    return res.status(400).json({ message: 'Developer username and follower identifier are required.' });
  }

  try {
    // 1. Verify profile ownership
    let isOwner = false;
    const isOfficialDev = ['upperstore', 'upper-store', 'upper_store'].includes(cleanUsername);
    if (isOfficialDev) {
      if (req.user?.role === 'admin') isOwner = true;
    }

    if (!isOwner) {
      const devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
      if (!devSnap.empty) {
        const dData = devSnap.docs[0].data();
        if (dData.userId === currentUserId || (dData.email && dData.email.toLowerCase() === req.user?.email?.toLowerCase())) {
          isOwner = true;
        }
      }
    }

    if (!isOwner) {
      const uSnap = await db.collection('users').doc(currentUserId).get();
      if (uSnap.exists) {
        const uData = uSnap.data();
        if ((uData.username || '').toLowerCase() === cleanUsername || (uData.email || '').toLowerCase() === req.user?.email?.toLowerCase()) {
          isOwner = true;
        }
      }
    }

    if (!isOwner && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only remove followers from your own profile.',
      });
    }

    // 2. Identify and delete follow documents across all possible keys
    let deleted = false;
    let canonicalUsername = cleanUsername;
    let targetUserId = null;

    if (isOfficialDev) {
      canonicalUsername = 'upperstore';
      targetUserId = 'GOhjkTTW9ZPqPS9I7Oa1';
    } else {
      const devLookup = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
      if (!devLookup.empty) {
        canonicalUsername = devLookup.docs[0].data().username || cleanUsername;
        targetUserId = devLookup.docs[0].data().userId || null;
      } else {
        const uLookup = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
        if (!uLookup.empty) {
          canonicalUsername = uLookup.docs[0].data().username || cleanUsername;
          targetUserId = uLookup.docs[0].id;
        }
      }
    }

    // Resolve follower ID if missing
    let resolvedFollowerId = followerId;
    if (!resolvedFollowerId && cleanFollowerUsername) {
      const uSnap = await db.collection('users').where('username', '==', cleanFollowerUsername).limit(1).get();
      if (!uSnap.empty) {
        resolvedFollowerId = uSnap.docs[0].id;
      }
    }

    // Delete direct document references across keys
    if (resolvedFollowerId) {
      const keysToDelete = [
        `${resolvedFollowerId}_${cleanUsername}`,
        `${resolvedFollowerId}_${canonicalUsername}`,
      ];
      if (targetUserId) keysToDelete.push(`${resolvedFollowerId}_${targetUserId}`);
      if (isOfficialDev) {
        keysToDelete.push(
          `${resolvedFollowerId}_upperstore`,
          `${resolvedFollowerId}_upperofficial`,
          `${resolvedFollowerId}_upper-store`,
          `${resolvedFollowerId}_upper_store`,
          `${resolvedFollowerId}_GOhjkTTW9ZPqPS9I7Oa1`
        );
      }

      for (const k of [...new Set(keysToDelete)]) {
        const ref = db.collection('developer_follows').doc(k);
        const s = await ref.get();
        if (s.exists) {
          await ref.delete().catch(() => {});
          deleted = true;
        }
      }
    }

    // Strategy B: Query by developerUsername and followerUsername
    if (cleanFollowerUsername) {
      const qSnap = await db.collection('developer_follows')
        .where('developerUsername', 'in', [cleanUsername, canonicalUsername])
        .where('followerUsername', '==', cleanFollowerUsername)
        .limit(10)
        .get();

      if (!qSnap.empty) {
        for (const doc of qSnap.docs) {
          await doc.ref.delete().catch(() => {});
        }
        deleted = true;
      }
    }

    // 3. Remove follow notification from this follower if exists
    try {
      if (cleanFollowerUsername) {
        const notifSnap = await db.collection('notifications')
          .where('type', '==', 'follow')
          .where('authorUsername', '==', cleanFollowerUsername)
          .get();
        for (const d of notifSnap.docs) {
          const nd = d.data();
          if (nd.targetUsername === cleanUsername || nd.targetUsername === canonicalUsername || (targetUserId && nd.targetUserId === targetUserId)) {
            await d.ref.delete().catch(() => {});
          }
        }
      }
    } catch (_) {}

    // 4. Recount followers
    let followersCount = 0;
    if (isOfficialDev) {
      const countSnap = await db.collection('developer_follows')
        .where('developerUsername', 'in', ['upperstore', 'upper-store', 'upper_store', 'upperofficial'])
        .count()
        .get();
      followersCount = countSnap.data().count || 0;
    } else {
      const countSnap = await db.collection('developer_follows').where('developerUsername', '==', canonicalUsername).count().get();
      followersCount = countSnap.data().count || 0;
      if (followersCount === 0 && cleanUsername !== canonicalUsername) {
        try {
          const fallbackSnap = await db.collection('developer_follows').where('developerUsername', '==', cleanUsername).count().get();
          if ((fallbackSnap.data().count || 0) > 0) followersCount = fallbackSnap.data().count;
        } catch (_) {}
      }
    }

    // Update developer and user records
    const devSnap = await db.collection('developers').where('username', '==', canonicalUsername).limit(1).get();
    if (!devSnap.empty) {
      await devSnap.docs[0].ref.update({
        followersCount,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    if (targetUserId) {
      db.collection('users').doc(targetUserId).update({
        followersCount,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    if (isOfficialDev) {
      db.collection('developers').where('username', 'in', ['upperstore', 'upperofficial', 'upper-store']).limit(1).get().then((snap) => {
        if (!snap.empty) {
          snap.docs[0].ref.update({ followersCount, updatedAt: new Date().toISOString() }).catch(() => {});
        }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Follower @${cleanFollowerUsername || 'user'} has been removed.`,
      followersCount,
      removedFollowerUsername: cleanFollowerUsername,
    });
  } catch (error) {
    console.error('Error removing follower:', error);
    return res.status(500).json({ message: 'Failed to remove follower.' });
  }
};

module.exports = {
  getMyDeveloperProfile,
  registerDeveloperKyc,
  withdrawDeveloperConsent,
  getAllDevelopers,
  toggleDeveloperSuspension,
  getPublicDeveloperProfile,
  updateDeveloperBio,
  getOfficialProfile,
  updateOfficialProfile,
  uploadOfficialCoverImage,
  removeOfficialCoverImage,
  toggleFollowDeveloper,
  getFollowStatus,
  getDeveloperFollowers,
  getDeveloperFollowing,
  removeDeveloperFollower,
};

