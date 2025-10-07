import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js'

const firebaseConfig = {
  apiKey: "AIzaSyAsfxkRiVrenBmfDhwSpKWvgsgJ4f1w6Vs",
  authDomain: "coderr-a3820.firebaseapp.com",
  projectId: "coderr-a3820",
  storageBucket: "coderr-a3820.firebasestorage.app",
  messagingSenderId: "1066035377317",
  appId: "1:1066035377317:web:5065cf5d96141307d8c94c",
  measurementId: "G-HF98H4CX6C"
};

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

export {
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp
}
