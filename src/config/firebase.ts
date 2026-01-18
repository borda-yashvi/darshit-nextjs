import admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = path.join(__dirname, '../../firebase-key.json');
console.log('🔑 Loading Firebase service account from:', require(serviceAccountPath));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });

  console.log('🔥 Firebase Admin initialized successfully');
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Optional connection test
// db.listCollections()
//   .then(() => console.log('📡 Firestore connected successfully'))
//   .catch(err => console.error('❌ Firestore connection failed:', err));

export { admin, db };