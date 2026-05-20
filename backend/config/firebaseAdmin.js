import admin from 'firebase-admin';

let authInstance = null;

const normalizePrivateKey = (key) => key?.replace(/\\n/g, '\n');

const getCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
    }
    return admin.credential.cert(serviceAccount);
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    });
  }

  return admin.credential.applicationDefault();
};

export const getFirebaseAuth = () => {
  if (authInstance) return authInstance;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  authInstance = admin.auth();
  return authInstance;
};
