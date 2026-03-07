import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  };

  const signIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">Welcome to Nexus</h1>
      <div className="login-form">
        <input
          type="email"
          placeholder="Email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="login-buttons">
          <button className="btn primary" onClick={signIn}>Sign In</button>
          <button className="btn secondary" onClick={signUp}>Sign Up</button>
        </div>
        <div className="divider">or</div>
        <button className="btn google" onClick={signInWithGoogle}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon" />
          Login with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
