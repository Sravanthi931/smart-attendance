import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBLUDD1k-f3B6zb_vhq1SeQvAEW9n4pTGE",
  authDomain: "smart-attendance-b57d5.firebaseapp.com",
  projectId: "smart-attendance-b57d5",
  storageBucket: "smart-attendance-b57d5.firebasestorage.app",
  messagingSenderId: "1044755449538",
  appId: "1:1044755449538:web:88854e7196502d7f419d5b",
  measurementId: "G-4QSKDHLXKS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
