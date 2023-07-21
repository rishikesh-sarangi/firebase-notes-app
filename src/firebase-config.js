// Firebase config file

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvshRJMRyx3KuepwDlr4xLDPnTHdeFsuQ",
  authDomain: "project-3c6cb.firebaseapp.com",
  projectId: "project-3c6cb",
  storageBucket: "project-3c6cb.appspot.com",
  messagingSenderId: "122037075990",
  appId: "1:122037075990:web:75b532ffd01f618b77b537",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
