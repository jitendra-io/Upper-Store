const crypto = require('crypto');
const { db } = require('../config/firebase');
const path = require('path');
const fs = require('fs');
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
      return res.json({
        isRegistered: false,
        developer: null,
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
      const isCanc = Boolean(m?.isCancelled || uData?.vipCancelledAt || m?.cancelledAt);
      if (m && (m.plan === 'pro' || m.plan === 'elite') && !isExp && !isCanc) {
        effectiveVipPlan = m.plan;
        isVipActive = true;
      } else {
        subscriptionEnded = Boolean(isExp || isCanc || m?.plan === 'free' || devData.subscriptionEnded);
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
      consentAcceptedAt: now.toISOString(),
      updatedAt: now.toISOString(),
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
      devPayload.createdAt = existingData.createdAt || existingDoc.createTime?.toDate()?.toISOString() || now.toISOString();
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
      devPayload.createdAt = now.toISOString();

      const newDoc = await db.collection('developers').add(devPayload);
      devId = newDoc.id;
    }

    // Mark user record as developer
    if (userDocRef) {
      try {
        const uUpdate = {
          isDeveloper: true,
          developerDisplayName: displayName.trim(),
          developerJoinedAt: devJoinedAt,
          developerUpdatedAt: now.toISOString(),
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

    // 1. Delete developer record from Firestore
    let devSnap = await db.collection('developers').where('userId', '==', userId).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).get();
    }

    for (const doc of devSnap.docs) {
      await doc.ref.delete();
    }

    // 2. Update user doc to revoke developer status
    if (userId) {
      const uDoc = await db.collection('users').doc(userId).get();
      if (uDoc.exists) {
        await uDoc.ref.update({
          isDeveloper: false,
          developerWithdrawnAt: new Date().toISOString(),
        });
      }
    } else if (cleanEmail) {
      const uSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!uSnap.empty) {
        await uSnap.docs[0].ref.update({
          isDeveloper: false,
          developerWithdrawnAt: new Date().toISOString(),
        });
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
      message: 'Developer consent successfully withdrawn and profile deregistered in compliance with Section 6(4) of the DPDP Act 2023.',
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
        legalName: d.legalName,
        displayName: d.displayName,
        phone: d.phone,
        aadhaarNumber: d.aadhaarNumber,
        aadhaarDriveLink: d.aadhaarDriveLink,
        vipPlan: (d.subscriptionEnded || d.vipPlan === 'free') ? 'free' : (d.vipPlan || 'free'),
        avatar: d.avatar,
        isSuspended: Boolean(d.isSuspended),
        suspendedAt: d.suspendedAt || null,
        suspensionReason: d.suspensionReason || null,
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

      return res.json({
        developer: {
          id: 'upper-store-official',
          username: 'upperstore',
          displayName: officialData.displayName || 'Upper Store Official',
          bio: (officialData.bio && officialData.bio.trim()) ? officialData.bio : 'None',
          avatar: officialData.avatar || '/logo.png',
          coverImage: officialData.coverImage || officialData.banner || '',
          banner: officialData.coverImage || officialData.banner || '',
          location: officialData.location || 'None',
          vipPlan: 'official', // Conic Emerald Green Official Ring
          isVerified: true,
          isOfficial: true,
          isDeveloper: true,
          isSuspended: false,
          joinedAt: officialData.joinedAt || 'January 2026',
        },
        stats: {
          productsCount: officialProducts.length,
          totalDownloads,
          averageRating: Number(avgRating),
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
    const isCancelled = Boolean(membership?.isCancelled || userData?.vipCancelledAt || membership?.cancelledAt);

    let isVipActive = false;
    let subscriptionEnded = false;
    let currentVipPlan = 'free';

    // A creator only gets premium rings and tags if their VIP subscription is valid, active, non-expired, and non-cancelled
    if (membership && (membership.plan === 'pro' || membership.plan === 'elite')) {
      if (isExpiredByDate || isCancelled) {
        subscriptionEnded = true;
        isVipActive = false;
        currentVipPlan = 'free';
      } else {
        isVipActive = true;
        subscriptionEnded = false;
        currentVipPlan = membership.plan;
      }
    } else {
      // Free tier, expired, cancelled, or deleted
      subscriptionEnded = Boolean(isExpiredByDate || isCancelled || membership?.plan === 'free' || devData?.subscriptionEnded);
      isVipActive = false;
      currentVipPlan = 'free';
    }

    // Sync stale Firestore developer document if subscription has ended or was cancelled
    if (devDoc && !isVipActive && devData?.vipPlan && devData.vipPlan !== 'free') {
      try {
        await devDoc.ref.update({
          vipPlan: 'free',
          isVipActive: false,
          subscriptionEnded: true,
          updatedAt: new Date().toISOString(),
        });
      } catch (syncErr) {
        // ignore
      }
    }

    // 4. Compute dynamic stats
    const totalDownloads = matchedProducts.reduce(
      (sum, p) => sum + (Number(p.downloadCount) || 0),
      0
    );
    const avgRating =
      matchedProducts.length > 0
        ? (
            matchedProducts.reduce((sum, p) => sum + (Number(p.rating) || 5), 0) / matchedProducts.length
          ).toFixed(1)
        : '5.0';

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
    };

    res.json({
      developer: publicProfile,
      stats: {
        productsCount: matchedProducts.length,
        totalDownloads,
        averageRating: Number(avgRating),
      },
      products: matchedProducts.map((p) => {
        const safe = { ...p };
        delete safe.developerEmail;
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

    const { displayName, bio, coverImage, banner, location } = req.body;
    const updates = {
      updatedAt: new Date().toISOString(),
    };
    if (displayName) updates.displayName = String(displayName).slice(0, 60);
    if (bio !== undefined) updates.bio = String(bio).slice(0, 500);
    if (location !== undefined) updates.location = String(location).slice(0, 80);
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
};

