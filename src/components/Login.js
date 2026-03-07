import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import "./Login.css";

/**
 * Login Component
 * Handles authentication via Email/Password and Google Sign-In
 * Includes validation, error handling, accessibility, and UI polish
 */
function Login() {
  // State variables
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Validation helpers
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 chars, one uppercase, one lowercase, one number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  // Reset messages on input change
  useEffect(() => {
    setError("");
    setSuccessMessage("");
  }, [email, password]);

  // Sign Up
  const signUp = async () => {
    if (!validateEmail(email)) {
      setError("Invalid email format.");
      return;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters, include uppercase, lowercase, and a number.");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccessMessage("Account created successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign In
  const signIn = async () => {
    if (!validateEmail(email)) {
      setError("Invalid email format.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      }
      setSuccessMessage("Logged in successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccessMessage("Logged in with Google!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const resetPassword = async () => {
    if (!email) {
      setError("Enter your email to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent!");
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="login-container">
      <h1 className="login-title">Welcome to Nexus</h1>
      <p className="login-subtitle">Sign in to join your meeting</p>

      <div className="login-form">
        {/* Email Input */}
        <label htmlFor="email" className="login-label">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />

        {/* Password Input */}
        <label htmlFor="password" className="login-label">Password</label>
        <div className="password-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
          <button
            type="button"
            className="toggle-password"
            onClick={togglePasswordVisibility}
            aria-label="Toggle password visibility"
          >
            {showPassword ? "🙈 Hide" : "👁 Show"}
          </button>
        </div>

        {/* Remember Me */}
        <div className="remember-me">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
          />
          <label htmlFor="rememberMe">Remember me</label>
        </div>

        {/* Error & Success Messages */}
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        {/* Buttons */}
        <div className="login-buttons">
          <button className="btn primary" onClick={signIn} disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
          <button className="btn secondary" onClick={signUp} disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </div>

        {/* Forgot Password */}
        <button className="btn link" onClick={resetPassword}>
          Forgot Password?
        </button>

        {/* Divider */}
        <div className="divider">or</div>

        {/* Google Login */}
        <button className="btn google" onClick={signInWithGoogle} disabled={loading}>
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="google-icon"
          />
          {loading ? "Loading..." : "Login with Google"}
        </button>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
      </footer>
    </div>
  );
}

export default Login;
