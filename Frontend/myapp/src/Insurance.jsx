import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Insurance.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Insurance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [insurance, setInsurance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [userCredits, setUserCredits] = useState(0);

  const fetchInsurance = async (type = 'all') => {
    try {
      setLoading(true);
      const response = await axios.get(
        type === 'all' 
          ? `${API_URL}/api/insurance`
          : `${API_URL}/api/insurance/type/${type}`
      );
      setInsurance(response.data);

      // Fetch user stats to get current credits
      const userStatsResponse = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
      setUserCredits(userStatsResponse.data.currentCredits);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching insurance:', err);
      setError('Failed to load insurance data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsurance(selectedType);
  }, [selectedType, user?.email]);

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
  };

  const handleBuyClick = (insuranceId) => {
    navigate(`/buy-insurance/${insuranceId}`);
  };

  return (
    <div className="insurance-container">
      <header className="insurance-header">
        <h1>Insurance Products</h1>
        <p>Protect your future with our comprehensive insurance plans</p>
        <div className="user-credits">
          Available Credits: ${userCredits.toFixed(2)}
        </div>
      </header>

      <div className="insurance-filters">
        <select 
          className="filter-select"
          value={selectedType}
          onChange={handleTypeChange}
        >
          <option value="all">All Types</option>
          <option value="life">Life Insurance</option>
          <option value="health">Health Insurance</option>
          <option value="property">Property Insurance</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading insurance data...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="insurance-grid">
          {insurance.length === 0 ? (
            <div className="no-insurance-message">
              <p>No insurance products available matching your filters. Please try different criteria.</p>
            </div>
          ) : (
            insurance.map((product) => (
              <div key={product.id} className="insurance-card">
                <div className="insurance-card-header">
                  <h3>{product.name}</h3>
                  <span className={`insurance-type ${product.type.toLowerCase()}`}>
                    {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                  </span>
                </div>
                <div className="insurance-details">
                  <div className="detail-item">
                    <span>Provider</span>
                    <strong>{product.provider}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Rating</span>
                    <strong>{product.rating}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Coverage</span>
                    <strong>${product.coverageAmount.toLocaleString()}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Monthly Premium</span>
                    <strong>${product.monthlyPremium.toLocaleString()}</strong>
                  </div>
                </div>
                <div className="features-list">
                  <h4>Key Features</h4>
                  <ul>
                    {product.features.slice(0, 4).map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <button 
                  className="buy-btn"
                  onClick={() => handleBuyClick(product.id)}
                  disabled={userCredits < product.monthlyPremium}
                >
                  {userCredits < product.monthlyPremium ? 'Insufficient Credits' : 'Purchase Now'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Insurance; 