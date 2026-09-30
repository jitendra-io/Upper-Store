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

    const messageData = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('messages').add(messageData);
    console.log(`📩 New Contact Message received from "${name}" (${email})`);

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

module.exports = { createMessage, getMessages, markMessageRead, deleteMessage };
