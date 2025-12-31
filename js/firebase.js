  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDgTKMe_bu-idiuYsuJcnb5aQdrgE6x_-c",
    authDomain: "shift-poll.firebaseapp.com",
    projectId: "shift-poll",
    storageBucket: "shift-poll.firebasestorage.app",
    messagingSenderId: "993683806228",
    appId: "1:993683806228:web:86f3ef7febe0443aa16f01"
  };

  // Initialize Firebase
  export const app = initializeApp(firebaseConfig);
  // Initialize Firestore
  export const db = getFirestore(app);