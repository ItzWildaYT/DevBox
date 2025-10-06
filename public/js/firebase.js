import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js'
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js'
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp, doc, updateDoc, limit } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js'
const firebaseConfig = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
  measurementId: 'FIREBASE_MEASUREMENT_ID'
}
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
export { auth, db, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, collection, addDoc, query, orderBy, getDocs, serverTimestamp, doc, updateDoc, limit }
