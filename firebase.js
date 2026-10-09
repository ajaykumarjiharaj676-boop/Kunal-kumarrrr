/**
 * Firebase Client SDK Initialization & Service Hooks
 * Connected to live Firebase project: kunal-a9793
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword
} from "firebase/auth";

// User's configured Firebase Credentials
export const firebaseConfig = {
  apiKey: "AIzaSyDl8gAVRsORKHig5PBf6tgZYkB-XWbejHc",
  authDomain: "kunal-a9793.firebaseapp.com",
  databaseURL: "https://kunal-a9793-default-rtdb.firebaseio.com",
  projectId: "kunal-a9793",
  storageBucket: "kunal-a9793.firebasestorage.app",
  messagingSenderId: "52137487333",
  appId: "1:52137487333:web:e656fd708f9a307a809d0c",
  measurementId: "G-XEVRD9SW19"
};

// Initialize Firebase App instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Export Firestore primitives for repository layer
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
};
