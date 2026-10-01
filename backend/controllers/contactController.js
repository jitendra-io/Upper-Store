const { db } = require('../config/firebase');

// @desc    Submit a contact message (Public)
// @route   POST /api/contact
// @access  Public
const createMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check 2-minute rate limit for sending contact messages (120,000 ms)
    const existingMessages = await db.collection('messages').where('email', '==', cleanEmail).get();
    if (!existingMessages.empty) {
      const sorted = existingMessages.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const latest = sorted[0];
      if (latest && latest.createdAt) {
        const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
        const TWO_MINUTES_MS = 2 * 60 * 1000;
        if (timeDiff < TWO_MINUTES_MS) {
          const secondsRemaining = Math.ceil((TWO_MINUTES_MS - timeDiff) / 1000);
          return res.status(400).json({
            message: `Please wait ${secondsRemaining} second(s) before sending another message.`,
          });
        }
      }
    }

    const messageData = {
      name: name.trim(),
      email: cleanEmail,
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('messages').add(messageData);
    console.log(`📩 New Contact Message received from "${name}" (${cleanEmail})`);

    res.status(201).json({
      id: docRef.id,
      message: 'Thank you! Your message has been sent directly to the Admin Inbox.',
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Error sending message. Please try again.' });
  }
};

// @desc    Get all contact messages (Admin Inbox)
// @route   GET /api/contact
// @access  Private (Admin)
const getMessages = async (req, res) => {
  try {
    const snapshot = await db.collection('messages').orderBy('createdAt', 'desc').get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error fetching inbox messages.' });
  }
};

// @desc    Mark a message as read
// @route   PUT /api/contact/:id/read
// @access  Private (Admin)
const markMessageRead = async (req, res) => {
  try {
    const docRef = db.collection('messages').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    await docRef.update({ read: true });
    res.json({ id: req.params.id, read: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Error updating message status.' });
  }
};

// @desc    Delete a message
// @route   DELETE /api/contact/:id
// @access  Private (Admin)
const deleteMessage = async (req, res) => {
  try {
    const docRef = db.collection('messages').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    await docRef.delete();
    res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message.' });
  }
};

// @desc    Submit a ban appeal (Public / Banned User)
// @route   POST /api/contact/appeal
// @access  Public
const submitAppeal = async (req, res) => {
  try {
    const { name, email, subject, commitment } = req.body;

    if (!name || !email || !commitment) {
      return res.status(400).json({ message: 'Name, email, and commitment message are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check 7-day rate limit for this email in appeals
    const existingAppeals = await db.collection('appeals').where('email', '==', cleanEmail).get();
    if (!existingAppeals.empty) {
      const sorted = existingAppeals.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const latest = sorted[0];
      if (latest && latest.createdAt) {
        const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        if (timeDiff < SEVEN_DAYS_MS) {
          const daysRemaining = Math.ceil((SEVEN_DAYS_MS - timeDiff) / (1000 * 60 * 60 * 24));
          return res.status(400).json({
            message: `You have already submitted an appeal. Please wait ${daysRemaining} day(s) for feedback before sending another appeal.`,
          });
        }
      }
    }

    const appealData = {
      name: name.trim(),
      email: cleanEmail,
      subject: subject ? subject.trim() : 'Account Ban Appeal',
      commitment: commitment.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('appeals').add(appealData);

    // Update user document if exists
    const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnapshot.empty) {
      await userSnapshot.docs[0].ref.update({
        lastAppealedAt: new Date().toISOString(),
      });
    }

    console.log(`⚖️ Ban Appeal received from "${name}" (${cleanEmail})`);

    res.status(201).json({
      id: docRef.id,
      message: 'Your appeal has been sent to officials. Please wait 7 days for feedback.',
    });
  } catch (error) {
    console.error('Submit appeal error:', error);
    res.status(500).json({ message: 'Error submitting appeal. Please try again.' });
  }
};

// @desc    Get all ban appeals (Admin)
// @route   GET /api/contact/appeals
// @access  Private (Admin)
const getAppeals = async (req, res) => {
  try {
    const snapshot = await db.collection('appeals').get();
    const appeals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    appeals.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(appeals);
  } catch (error) {
    console.error('Get appeals error:', error);
    res.status(500).json({ message: 'Error fetching appeals.' });
  }
};

// @desc    Resolve appeal & unban user (Admin)
// @route   POST /api/contact/appeals/:appealId/resolve
// @access  Private (Admin)
const resolveAppealAndUnban = async (req, res) => {
  try {
    const { appealId } = req.params;
    const appealRef = db.collection('appeals').doc(appealId);
    const doc = await appealRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Appeal not found.' });
    }

    const appealData = doc.data();
    const cleanEmail = appealData.email;

    // Update appeal status
    await appealRef.update({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });

    // Unban user in users collection
    const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnapshot.empty) {
      await userSnapshot.docs[0].ref.update({
        isBanned: false,
        unbannedAt: new Date().toISOString(),
      });
    }

    res.json({ message: `Appeal resolved and user (${cleanEmail}) has been unbanned successfully.` });
  } catch (error) {
    console.error('Resolve appeal error:', error);
    res.status(500).json({ message: 'Error resolving appeal.' });
  }
};

module.exports = {
  createMessage,
  getMessages,
  markMessageRead,
  deleteMessage,
  submitAppeal,
  getAppeals,
  resolveAppealAndUnban,
};

