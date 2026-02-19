import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AddCredits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAddCredits = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const amountInPaise = Math.round(parseFloat(amount) * 100);
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        setError("Failed to load Razorpay SDK. Please try again.");
        setLoading(false);
        return;
      }

      const options = {
        key: 'rzp_test_2BZTggwTEwm8GC',
        amount: amountInPaise,
        currency: 'INR',
        name: 'InvestDelta',
        description: 'Add Credits',
        handler: async function (response) {
          try {
            // Update user credits after successful payment
            const updateResponse = await axios.post(`${API_URL}/api/users/update-credits`, {
              email: user.email,
              credits: parseFloat(amount)
            });

            setSuccess('Credits added successfully!');
            setTimeout(() => {
              navigate('/portfolio');
            }, 1500);
          } catch (err) {
            setError('Failed to update credits. Please contact support.');
          }
        },
        prefill: {
          name: user.name || "User",
          email: user.email,
          contact: user.phone || "",
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/portfolio');
  };

  return (
    <div className="add-credits-container">
      <button onClick={handleBack} className="back-button"> Back</button>
      
      <div className="credits-form-container">
        <h2>Add Credits</h2>
        
        <form onSubmit={handleAddCredits} className="credits-form">
          <div className="form-group">
            <label>Amount (INR):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              required
              placeholder="Enter amount in INR"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="add-credits-button"
            disabled={loading || !amount || amount <= 0}
          >
            {loading ? 'Processing...' : 'Add Credits'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCredits; 