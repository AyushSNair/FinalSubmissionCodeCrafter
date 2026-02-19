import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const BuyBond = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bondInfo, setBondInfo] = useState(null);
  const [investment, setInvestment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch bond info
        const bondResponse = await axios.get(`${API_URL}/api/bonds/${id}`);
        setBondInfo(bondResponse.data);

        // Fetch user stats to get current credits
        const userStatsResponse = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
        setUserCredits(userStatsResponse.data.currentCredits);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load bond information');
        setLoading(false);
      }
    };

    if (id && user?.email) {
      fetchData();
    }
  }, [id, user?.email]);

  const handleBuy = async (e) => {
    e.preventDefault();
    if (!investment || investment < bondInfo.minimumInvestment) {
      setError(`Minimum investment required is $${bondInfo.minimumInvestment.toLocaleString()}`);
      return;
    }

    if (investment > userCredits) {
      setError(`Insufficient credits. You need $${investment.toLocaleString()} but have $${userCredits.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/bonds/buy`, { 
        email: user.email, 
        bondId: id, 
        investment: parseFloat(investment)
      });
      
      setSuccess('Bond purchased successfully!');
      setUserCredits(response.data.remainingCredits);
      setLoading(false);
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/portfolio');
      }, 1500);
    } catch (err) {
      setLoading(false);
      if (err.response?.data?.message === "Insufficient credits") {
        setError(`Insufficient credits. Required: $${err.response.data.required.toFixed(2)}, Available: $${err.response.data.available.toFixed(2)}`);
      } else {
        setError(err.response?.data?.message || "Error buying bond");
      }
    }
  };

  const handleBack = () => {
    navigate('/bonds');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!bondInfo) return <div className="error">Bond not found</div>;

  return (
    <div className="buy-stock-container">
      <button onClick={handleBack} className="back-button">ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back</button>
      
      <div className="stock-info-header">
        <h2>{bondInfo.name}</h2>
        <div className="user-credits">
          Available Credits: <span className={investment > userCredits ? 'insufficient' : ''}>
            ${userCredits.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="stock-details">
        <div className="price-info">
          <div className="current-price">
            Interest Rate: {bondInfo.interestRate}%
            <span className="yield">
              Yield to Maturity: {bondInfo.yieldToMaturity}%
            </span>
          </div>
        </div>

        <div className="market-info">
          <div>
            <span>Duration:</span> {bondInfo.duration} years
          </div>
          <div>
            <span>Rating:</span> {bondInfo.rating}
          </div>
          <div>
            <span>Minimum Investment:</span> ${bondInfo.minimumInvestment.toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleBuy} className="buy-form">
          <div className="form-group">
            <label>Investment Amount:</label>
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              min={bondInfo.minimumInvestment}
              step="100"
              required
            />
          </div>

          <div className="cost-preview">
            <div>Investment Amount: <span className={investment > userCredits ? 'insufficient' : ''}>
              ${parseFloat(investment || 0).toLocaleString()}
            </span></div>
            <div>Remaining Credits: <span className={investment > userCredits ? 'insufficient' : ''}>
              ${(userCredits - (investment || 0)).toFixed(2)}
            </span></div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="buy-button"
            disabled={loading || investment > userCredits || investment < bondInfo.minimumInvestment}
          >
            {loading ? 'Processing...' : 'Buy Bond'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BuyBond; 