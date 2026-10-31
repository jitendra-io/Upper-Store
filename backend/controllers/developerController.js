const { db } = require('../config/firebase');

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
  const { legalName, displayName, username, phone, aadhaarNumber, aadhaarDriveLink } = req.body;
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
      `🛡️ [Admin] Developer ${doc.data().email || id} ${
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

module.exports = {
  getMyDeveloperProfile,
  registerDeveloperKyc,
  getAllDevelopers,
  toggleDeveloperSuspension,
};

