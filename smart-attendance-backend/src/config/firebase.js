const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, "../../firebase-service-account.json");

let firebaseApp = null;

try {
  const fs = require('fs');
  const fileExists = fs.existsSync(serviceAccountPath);

  if (fileExists) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized (Local File)");
      firebaseApp = admin;
  } 
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
     admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log("Firebase Admin initialized (Env Vars)");
    firebaseApp = admin;
  } else {
    console.warn("Firebase credentials not found. Push notifications will be mocked.");
  }
} catch (error) {
  console.warn("Failed to initialize Firebase:", error.message);
}

module.exports = firebaseApp;
