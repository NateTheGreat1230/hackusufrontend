import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyADoaQwFl3086AVzGCEa891f3VZTAoWYn0",
  authDomain: "hackusu-repair-manager.firebaseapp.com",
  projectId: "hackusu-repair-manager",
  storageBucket: "hackusu-repair-manager.firebasestorage.app",
  messagingSenderId: "475239334487",
  appId: "1:475239334487:web:c703d133c60a04d06a9912"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { db, auth };