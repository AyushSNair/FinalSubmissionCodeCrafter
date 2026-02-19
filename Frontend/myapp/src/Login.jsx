import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Login.css";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isSignUp ? "/api/users/register" : "/api/users/login";

    try {
      const response = await axios.post(`${API_URL}${endpoint}`, formData);
      setMessage({ text: response.data.message || "Success!", type: "success" });

      // Reset inputs & switch to sign-in after successful sign-up
      if (isSignUp) {
        setFormData({ name: "", email: "", password: "" });
        setTimeout(() => {
          setIsSignUp(false);
          setMessage({ text: "", type: "" });
        }, 1500);
      } else {
        // If login is successful, update auth context and redirect to Home page
        login(response.data.user || { email: formData.email });
        setTimeout(() => {
          navigate('/home');
        }, 1000);
      }
    } catch (error) {
      setMessage({
        text: error.response?.data.message || JSON.stringify(error.response?.data) || "Something went wrong!",
        type: "danger",
      });
    }
  };

  // Hide message when toggling between sign-in and sign-up
  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    setMessage({ text: "", type: "" });
  
    // Reset the form data when switching
    setFormData({ name: "", email: "", password: "" });
  };
  

  return (
    <div className="auth-container">
      {/* Left Section (Illustration/Text) */}
      <motion.div
        className="auth-left"
        animate={{ x: isSignUp ? "100%" : "0%", transition: { type: "spring", stiffness: 80 } }}
      >
        <h1>{isSignUp ? "Join Us!" : "Welcome Back!"}</h1>
        <p>{isSignUp ? "Sign up and start exploring!" : "Sign in to continue"}</p>
        <img src="https://cdn-icons-png.flaticon.com/512/3101/3101626.png" alt="Illustration" />
      </motion.div>

      {/* Right Section (Form) */}
      <motion.div
        className="auth-right"
        animate={{ x: isSignUp ? "-100%" : "0%", transition: { type: "spring", stiffness: 80 } }}
      >
        <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>

        {/* Success/Error Message */}
        {message.text && (
          <div className={`alert alert-${message.type} fade show`} role="alert">
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="input-group">
              <label>Name</label>
              <div className="input-icon">
                <FaUser className="icon" />
                <input type="text" name="name" value={formData.name} placeholder="Enter your name" onChange={handleChange} required />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <div className="input-icon">
              <FaEnvelope className="icon" />
              <input type="email" name="email" value={formData.email} placeholder="Enter your email" onChange={handleChange} required />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-icon">
              <FaLock className="icon" />
              <input type="password" name="password" value={formData.password} placeholder="Enter your password" onChange={handleChange} required />
            </div>
          </div>

          {!isSignUp && (
            <div className="forgot-password">
              <a href="#">Forgot Password?</a>
            </div>
          )}

          <button type="submit" className="primary-btn">
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>

          <p className="toggle-text" onClick={toggleForm}>
            {isSignUp ? "Already have an account? Sign In" : "New User? Sign Up"}
          </p>

          <div className="social-login">
            <button className="social-btn google">
              <FcGoogle className="social-icon" />Sign in with Google
            </button>
            
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AuthPage;
