import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js'
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js'
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp, doc, updateDoc, limit } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js'
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
const auth = getAuth(app)
const db = getFirestore(app)
export { auth, db, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, collection, addDoc, query, orderBy, getDocs, serverTimestamp, doc, updateDoc, limit }
