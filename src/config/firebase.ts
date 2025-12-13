import admin from "firebase-admin";
import Module from "module";
import path from "path";
import { initializeApp } from 'firebase-admin/app';
const serviceAccountPath = path.join(__dirname, "../../firebase-key.json");
let db
try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });

  console.log("🔥 Firebase Admin initialized successfully!");

  const dbs = admin.firestore();
  dbs.settings({
    ignoreUndefinedProperties: true
  });

  const app = initializeApp();

  // Test: simple Firestore read to confirm connection
  db = dbs.listCollections()
    .then(() => {
      console.log("📡 Firestore connected successfully!");
    })
    .catch((err) => {
      console.error("❌ Firestore connection failed:", err);
    });


} catch (error) {
  console.error("❌ Firebase Admin initialization failed:", error);
}
export default db;
