// src/Header.js
import React, { useEffect } from "react";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase-config";
import "./header.css";
import Cookies from "universal-cookie";

function Header(props) {
  const cookies = new Cookies();

  useEffect(() => {
    const userId = cookies.get("userId");
    if (userId) {
      // If the user ID exists in cookies, set the state using it
      props.setUserUID(userId);
      props.setIsLoggedIn(true);
      fetchUserData(userId);
    }
  }, [props]);

  const fetchUserData = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (userDocSnapshot.exists()) {
        // If the document already exists, print its value
        const userData = userDocSnapshot.data();
        console.log(`User with UID ${uid} already exists. Data:`, userData);
        props.setNoteIds(userData.noteIds);
      } else {
        // If the document does not exist, create a new one
        await setDoc(userDocRef, { noteIds: [] }, { merge: true });
        console.log(`New user document with UID ${uid} created in the users collection.`);
        props.setNoteIds([]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    const userId = cookies.get("userId");
    if (userId) {
      // If the user ID exists in cookies, skip the sign-in process
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      // Handle successful login here, e.g., show a welcome message
      console.log("Logged in successfully!", result.user);

      // Check if the user document already exists in the "users" collection
      const uid = result.user.uid;
      props.setUserUID(uid);
      fetchUserData(uid);

      // Store user ID in a cookie to keep the user logged in
      cookies.set("userId", uid, { path: "/" });
    } catch (error) {
      // Handle errors here, e.g., display an error message
      console.error("Error signing in with Google:", error);
    }
  };

  const handleLogout = () => {
    // Remove the user ID cookie
    cookies.remove("userId", { path: "/" });

    // Reset the user state
    props.setUserUID(null);
    props.setNoteIds([]);
    props.setIsLoggedIn(false);

    // Refresh the page to update the UI
    window.location.reload();
  };

  return (
    <header className="header">
      <a className="title">Folio</a>
      <nav className="navigation">
        <ul>
          <li>
            {props.isLoggedIn ? (
              // Show the logout button if the user is logged in
              <button className="login-button" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              // Show the login button if the user is not logged in
              <button className="login-button" onClick={handleGoogleLogin}>
                Login with Google
              </button>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
