import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const BuyInsurance = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [insuranceInfo, setInsuranceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch insurance info
        const insuranceResponse = await axios.get(`${API_URL}/api/insurance/${id}`);
        setInsuranceInfo(insuranceResponse.data);

        // Fetch user stats to get current credits
        const userStatsResponse = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
        setUserCredits(userStatsResponse.data.currentCredits);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load insurance information');
        setLoading(false);
      }
    };

    if (id && user?.email) {
      fetchData();
    }
  }, [id, user?.email]);

  const handleBuy = async (e) => {
    e.preventDefault();
    
    if (insuranceInfo.monthlyPremium > userCredits) {
      setError(`Insufficient credits for monthly premium. You need $${insuranceInfo.monthlyPremium.toLocaleString()} but have $${userCredits.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/insurance/buy`, { 
        email: user.email, 
        insuranceId: id
      });
      
      setSuccess('Insurance purchased successfully!');
      setUserCredits(response.data.remainingCredits);
      setLoading(false);
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/portfolio');
      }, 1500);
    } catch (err) {
      setLoading(false);
      if (err.response?.data?.message === "Insufficient credits for first month's premium") {
        setError(`Insufficient credits. Required: $${err.response.data.required.toFixed(2)}, Available: $${err.response.data.available.toFixed(2)}`);
      } else {
        setError(err.response?.data?.message || "Error purchasing insurance");
      }
    }
  };

  const handleBack = () => {
    navigate('/insurance');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!insuranceInfo) return <div className="error">Insurance product not found</div>;

  return (
    <div className="buy-stock-container">
      <button onClick={handleBack} className="back-button">ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back</button>
      
      <div className="stock-info-header">
        <h2>{insuranceInfo.name}</h2>
        <div className="user-credits">
          Available Credits: <span className={insuranceInfo.monthlyPremium > userCredits ? 'insufficient' : ''}>
            ${userCredits.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="stock-details">
        <div className="price-info">
          <div className="current-price">
            Monthly Premium: ${insuranceInfo.monthlyPremium}
            <span className="yield">
              Coverage Amount: ${insuranceInfo.coverageAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="market-info">
          <div>
            <span>Provider:</span> {insuranceInfo.provider}
          </div>
          <div>
            <span>Rating:</span> {insuranceInfo.rating}
          </div>
          <div>
            <span>Term:</span> {insuranceInfo.term === 'Lifetime' ? 'Lifetime' : `${insuranceInfo.term} year(s)`}
          </div>
          <div>
            <span>Type:</span> {insuranceInfo.type.charAt(0).toUpperCase() + insuranceInfo.type.slice(1)} Insurance
          </div>
        </div>

        <div className="features-section">
          <h3>Features & Benefits</h3>
          <ul>
            {insuranceInfo.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className="cost-preview">
          <div>Monthly Premium: <span className={insuranceInfo.monthlyPremium > userCredits ? 'insufficient' : ''}>
            ${insuranceInfo.monthlyPremium.toLocaleString()}
          </span></div>
          <div>Remaining Credits: <span className={insuranceInfo.monthlyPremium > userCredits ? 'insufficient' : ''}>
            ${(userCredits - insuranceInfo.monthlyPremium).toFixed(2)}
          </span></div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button 
          onClick={handleBuy}
          className="buy-button"
          disabled={loading || insuranceInfo.monthlyPremium > userCredits}
        >
          {loading ? 'Processing...' : 'Purchase Insurance'}
        </button>
      </div>
    </div>
  );
};

export default BuyInsurance; 