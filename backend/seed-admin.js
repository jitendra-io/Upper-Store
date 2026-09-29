/**
 * ONE-TIME ADMIN SEED SCRIPT — Firebase Firestore version
 * Run once to create your admin account.
 * DELETE this file after running.
 *
 * Usage: node seed-admin.js
 */

const dotenv = require('dotenv');
dotenv.config();

require('./config/firebase');
const { db } = require('./config/firebase');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    console.log('Connecting to Firestore...');
    
    const snapshot = await db.collection('admins').where('username', '==', 'Upper-Admin').get();
    if (!snapshot.empty) {
      console.log('⚠️  Admin already exists. Exiting.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Upper@2026', salt);

    await db.collection('admins').add({
      username: 'Upper-Admin',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    console.log('✅ Admin created successfully in Firestore!');
    console.log('   Username: Upper-Admin');
    console.log('   Password has been securely hashed.');
    console.log('\n🔒 SECURITY: Delete this file now (seed-admin.js)!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seedAdmin();
