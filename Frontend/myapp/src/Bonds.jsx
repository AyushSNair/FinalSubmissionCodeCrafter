import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Bonds.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Bonds = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [userCredits, setUserCredits] = useState(0);

  const fetchBonds = async (type = 'all') => {
    try {
      setLoading(true);
      const response = await axios.get(
        type === 'all' 
          ? `${API_URL}/api/bonds`
          : `${API_URL}/api/bonds/type/${type}`
      );
      setBonds(response.data);

      // Fetch user stats to get current credits
      const userStatsResponse = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
      setUserCredits(userStatsResponse.data.currentCredits);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bonds:', err);
      setError('Failed to load bonds data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBonds(selectedType);
  }, [selectedType, user?.email]);

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
  };

  const handleDurationChange = (e) => {
    setSelectedDuration(e.target.value);
  };

  const handleBuyClick = (bondId) => {
    navigate(`/buy-bond/${bondId}`);
  };

  const filterBondsByDuration = (bond) => {
    if (selectedDuration === 'all') return true;
    
    switch (selectedDuration) {
      case 'short':
        return bond.duration <= 3;
      case 'medium':
        return bond.duration > 3 && bond.duration <= 10;
      case 'long':
        return bond.duration > 10;
      default:
        return true;
    }
  };

  const filteredBonds = bonds.filter(filterBondsByDuration);

  return (
    <div className="bonds-container">
      <header className="bonds-header">
        <h1>Bonds Market</h1>
        <p>Explore and invest in government and corporate bonds</p>
        <div className="user-credits">
          Available Credits: ${userCredits.toFixed(2)}
        </div>
      </header>

      {loading ? (
        <div className="loading-spinner">Loading bonds data...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="bonds-grid">
          <div className="bonds-filters">
            <h3>Filter Bonds</h3>
            <div className="filter-options">
              <select 
                className="filter-select"
                value={selectedType}
                onChange={handleTypeChange}
              >
                <option value="all">All Types</option>
                <option value="government">Government Bonds</option>
                <option value="corporate">Corporate Bonds</option>
                <option value="municipal">Municipal Bonds</option>
              </select>
              <select 
                className="filter-select"
                value={selectedDuration}
                onChange={handleDurationChange}
              >
                <option value="all">All Durations</option>
                <option value="short">Short Term (1-3 years)</option>
                <option value="medium">Medium Term (4-10 years)</option>
                <option value="long">Long Term (10+ years)</option>
              </select>
            </div>
          </div>

          <div className="bonds-list">
            {filteredBonds.length === 0 ? (
              <div className="no-bonds-message">
                <p>No bonds available matching your filters. Please try different criteria.</p>
              </div>
            ) : (
              filteredBonds.map((bond) => (
                <div key={bond.id} className="bond-card">
                  <div className="bond-header">
                    <h3>{bond.name}</h3>
                    <span className={`bond-type ${bond.type.toLowerCase()}`}>
                      {bond.type}
                    </span>
                  </div>
                  <div className="bond-details">
                    <div className="detail-item">
                      <span>Interest Rate</span>
                      <strong>{bond.interestRate}%</strong>
                    </div>
                    <div className="detail-item">
                      <span>Duration</span>
                      <strong>{bond.duration} years</strong>
                    </div>
                    <div className="detail-item">
                      <span>Minimum Investment</span>
                      <strong>${bond.minimumInvestment.toLocaleString()}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Rating</span>
                      <strong>{bond.rating}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Yield to Maturity</span>
                      <strong>{bond.yieldToMaturity}%</strong>
                    </div>
                  </div>
                  <button 
                    className="invest-btn"
                    onClick={() => handleBuyClick(bond.id)}
                    disabled={userCredits < bond.minimumInvestment}
                  >
                    {userCredits < bond.minimumInvestment ? 'Insufficient Credits' : 'Invest Now'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bonds; 