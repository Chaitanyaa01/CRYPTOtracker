import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

export { firebaseAuth, isFirebaseConfigured };
