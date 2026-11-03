const { db } = require('../config/firebase');
const path = require('path');
const fs = require('fs');
const { uploadFileToCloudOrLocal } = require('../services/imagekitService');

const isOfficialAuthorized = (req) => {
  if (!req.user) return false;
  if (req.user.role === 'admin') return true;
  const email = (req.user.email || '').toLowerCase();
  const allowedEmails = ['upper.official.in@gmail.com', 'kumar.jkm.io@gmail.com'];
  if (allowedEmails.includes(email)) return true;
  return false;
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

    res.json({
      isRegistered: true,
      developer: {
        id: devDoc.id,
        ...devData,
        productsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching developer profile:', error);
    res.status(500).json({ message: 'Failed to retrieve developer profile.' });
  }
};

// @desc    Register or Update Developer Aadhaar KYC
// @route   POST /api/developers/register
// @access  Private (Active VIP Member)
const registerDeveloperKyc = async (req, res) => {
  const { legalName, displayName, username, bio, phone, aadhaarNumber, aadhaarDriveLink } = req.body;
  const userId = req.user.uid;
  const cleanEmail = (req.user.email || '').trim().toLowerCase();

  // 1. Validation of required fields
  if (!legalName || !displayName || !phone || !aadhaarNumber || !aadhaarDriveLink) {
    return res.status(400).json({
      message: 'All fields are required: Full Legal Name, Developer Name, Phone Number, Aadhaar Number, and Aadhaar Drive Link.',
    });
  }

  // 2. Validate Aadhaar Number format (12 digits, optional spaces/hyphens)
  const cleanAadhaar = aadhaarNumber.toString().replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(cleanAadhaar)) {
    return res.status(400).json({
      message: 'Invalid Aadhaar number. Must be a valid 12-digit Indian Aadhaar number.',
    });
  }

  // 3. Validate Phone Number (10 digits)
  const cleanPhone = phone.toString().replace(/[\s-+()]/g, '');
  if (!/^\d{10}$/.test(cleanPhone)) {
    return res.status(400).json({
      message: 'Invalid phone number. Must be a 10-digit mobile number.',
    });
  }

  // 4. Validate Google Drive Link URL
  const cleanDriveLink = aadhaarDriveLink.trim();
  try {
    const parsed = new URL(cleanDriveLink);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    return res.status(400).json({
      message: 'Invalid URL. Please provide a valid Google Drive link to the clear Aadhaar card photo.',
    });
  }

  // Validate Developer Username: lowercase letters, numbers, _, and . only
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
    // 5. Verify User exists and has active VIP membership
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

    // 6. Check for existing developer document
    let existingDevSnap = await db.collection('developers').where('userId', '==', userId).limit(1).get();
    if (existingDevSnap.empty && cleanEmail) {
      existingDevSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }

    const devPayload = {
      userId,
      email: cleanEmail,
      username: cleanDevUsername || userData.username || null,
      legalName: legalName.trim(),
      displayName: displayName.trim(),
      bio: (bio || userData.bio || '').trim().slice(0, 500),
      phone: cleanPhone,
      aadhaarNumber: cleanAadhaar,
      aadhaarDriveLink: cleanDriveLink,
      vipPlan: membership?.plan || 'pro',
      avatar: userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
      updatedAt: new Date().toISOString(),
    };

    let devId;
    if (!existingDevSnap.empty) {
      // Update existing
      const existingDoc = existingDevSnap.docs[0];
      devId = existingDoc.id;
      const existingData = existingDoc.data();

      // Preserve suspension status if set by admin
      devPayload.isSuspended = Boolean(existingData.isSuspended);
      devPayload.suspendedAt = existingData.suspendedAt || null;
      devPayload.suspensionReason = existingData.suspensionReason || null;
      devPayload.createdAt = existingData.createdAt || new Date().toISOString();

      await existingDoc.ref.update(devPayload);
    } else {
      // Create new
      devPayload.isSuspended = false;
      devPayload.suspendedAt = null;
      devPayload.suspensionReason = null;
      devPayload.createdAt = new Date().toISOString();

      const newDoc = await db.collection('developers').add(devPayload);
      devId = newDoc.id;
    }

    // Mark user record as developer
    if (userDocRef) {
      try {
        const uUpdate = {
          isDeveloper: true,
          developerDisplayName: displayName.trim(),
          developerUpdatedAt: new Date().toISOString(),
        };
        if (cleanDevUsername) {
          uUpdate.username = cleanDevUsername;
        }
        if (bio !== undefined) {
          uUpdate.bio = (bio || '').trim().slice(0, 500);
        }
        await userDocRef.update(uUpdate);
      } catch (uErr) {
        // Non-critical
      }
    }

    res.json({
      message: 'Developer Aadhaar verification registered successfully! You can now publish products and broadcast notifications.',
      developer: {
        id: devId,
        ...devPayload,
      },
    });
  } catch (error) {
    console.error('Developer registration error:', error);
    res.status(500).json({ message: 'Failed to register developer verification.' });
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
        vipPlan: d.vipPlan || 'pro',
        avatar: d.avatar,
        isSuspended: Boolean(d.isSuspended),
        suspendedAt: d.suspendedAt || null,
        suspensionReason: d.suspensionReason || null,
        productsCount: prodCount,
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
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => p.isStoreOfficial || !p.developerId || !p.isDeveloperProduct);

      const totalDownloads = officialProducts.reduce(
        (sum, p) => sum + (Number(p.downloadsCount) || Number(p.downloads) || 0),
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
          bio: officialData.bio || 'Official Upper Store verified publishing house. Curating elite software, cybersecurity tools, utilities, and developer frameworks for the community.',
          avatar: officialData.avatar || '/logo.png',
          coverImage: officialData.coverImage || officialData.banner || '',
          banner: officialData.coverImage || officialData.banner || '',
          location: officialData.location || 'None',
          vipPlan: 'elite', // Conic Royal Purple Elite Ring
          isVerified: true,
          isOfficial: true,
          isDeveloper: true,
          isSuspended: false,
          joinedAt: officialData.joinedAt || '2026-01-01T00:00:00.000Z',
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
      const allProds = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

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

    let isVipActive = false;
    let subscriptionEnded = false;
    let currentVipPlan = 'free';

    if (membership && (membership.plan === 'pro' || membership.plan === 'elite')) {
      if (isExpiredByDate) {
        subscriptionEnded = true;
        isVipActive = false;
        currentVipPlan = 'free'; // Ring becomes inactive/standard
      } else {
        isVipActive = true;
        subscriptionEnded = false;
        currentVipPlan = membership.plan;
      }
    } else if (devData && devData.vipPlan && devData.vipPlan !== 'free') {
      if (isExpiredByDate) {
        subscriptionEnded = true;
        isVipActive = false;
        currentVipPlan = 'free';
      } else {
        currentVipPlan = devData.vipPlan;
        isVipActive = true;
      }
    }

    // Default active verified developers to 'pro' ring if not expired
    if (!subscriptionEnded && isDeveloper && currentVipPlan === 'free') {
      currentVipPlan = 'pro';
      isVipActive = true;
    }

    // 4. Compute dynamic stats
    const totalDownloads = matchedProducts.reduce(
      (sum, p) => sum + (Number(p.downloadsCount) || Number(p.downloads) || 0),
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
      bio: (devData?.bio && devData.bio.trim()) || (userData?.bio && userData.bio.trim()) || (isDeveloper ? 'Verified Upper Store Creator. Building high-performance software and developer tools.' : 'Upper Store Community Member.'),
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
      joinedAt: devData?.createdAt || userData?.createdAt || null,
    };

    res.json({
      developer: publicProfile,
      stats: {
        productsCount: matchedProducts.length,
        totalDownloads,
        averageRating: Number(avgRating),
      },
      products: matchedProducts,
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

    const cleanBio = (bio || '').trim().slice(0, 500);

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
        bio: officialData.bio || 'Official Upper Store verified publishing house. Curating elite software, cybersecurity tools, utilities, and developer frameworks for the community.',
        avatar: officialData.avatar || '/logo.png',
        coverImage: officialData.coverImage || officialData.banner || '',
        banner: officialData.coverImage || officialData.banner || '',
        location: officialData.location || 'None',
        vipPlan: 'elite',
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
    return res.json({
      message: 'Upper Store Official profile updated successfully.',
      developer: {
        id: 'upper-store-official',
        username: 'upperstore',
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
  getAllDevelopers,
  toggleDeveloperSuspension,
  getPublicDeveloperProfile,
  updateDeveloperBio,
  getOfficialProfile,
  updateOfficialProfile,
  uploadOfficialCoverImage,
  removeOfficialCoverImage,
};

