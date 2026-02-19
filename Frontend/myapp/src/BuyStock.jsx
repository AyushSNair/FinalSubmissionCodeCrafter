import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const BuyStock = () => {
  const { symbol } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stockInfo, setStockInfo] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch stock info
        const stockResponse = await axios.get(`${API_URL}/api/stocks/intraday/${symbol}`);
        setStockInfo(stockResponse.data);

        // Fetch user stats to get current credits
        const userStatsResponse = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
        setUserCredits(userStatsResponse.data.currentCredits);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load stock information');
        setLoading(false);
      }
    };

    if (symbol && user?.email) {
      fetchData();
    }
  }, [symbol, user?.email]);

  const handleBuy = async (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const totalCost = stockInfo.currentPrice * quantity;
    if (totalCost > userCredits) {
      setError(`Insufficient credits. You need $${totalCost.toFixed(2)} but have $${userCredits.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/stocks/buy`, { 
        email: user.email, 
        symbol, 
        quantity: parseInt(quantity) 
      });
      
      setSuccess('Stock purchased successfully!');
      setUserCredits(response.data.remainingCredits);
      setLoading(false);
      
      // Update stock info after purchase
      setStockInfo(prev => ({
        ...prev,
        quantity: prev.quantity - parseInt(quantity)
      }));
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/portfolio');
      }, 1500);
    } catch (err) {
      setLoading(false);
      if (err.response?.data?.message === "Insufficient credits") {
        setError(`Insufficient credits. Required: $${err.response.data.required.toFixed(2)}, Available: $${err.response.data.available.toFixed(2)}`);
      } else {
        setError(err.response?.data?.message || "Error buying stock");
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const totalCost = stockInfo ? (quantity * stockInfo.currentPrice).toFixed(2) : 0;

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stockInfo) return <div className="error">Stock not found</div>;

  return (
    <div className="buy-stock-container">
      <button onClick={handleBack} className="back-button">Back</button>
      
      <div className="stock-info-header">
        <h2>{stockInfo.name} ({stockInfo.symbol})</h2>
        <div className="user-credits">
          Available Credits: <span className={totalCost > userCredits ? 'insufficient' : ''}>
            ${userCredits.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="stock-details">
        <div className="price-info">
          <div className="current-price">
            ${stockInfo.currentPrice.toFixed(2)}
            <span className={stockInfo.change >= 0 ? 'positive' : 'negative'}>
              {stockInfo.change >= 0 ? '' : ''} {Math.abs(stockInfo.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="market-info">
          <div>
            <span>Volume:</span> {formatNumber(stockInfo.volume)}
          </div>
          <div>
            <span>Market Cap:</span> ${formatNumber(stockInfo.marketCap)}
          </div>
          <div>
            <span>Available Quantity:</span> {stockInfo.quantity}
          </div>
        </div>

        <form onSubmit={handleBuy} className="buy-form">
          <div className="form-group">
            <label>Quantity:</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={stockInfo.quantity}
              required
            />
          </div>

          <div className="cost-preview">
            <div>Total Cost: <span className={totalCost > userCredits ? 'insufficient' : ''}>${totalCost}</span></div>
            <div>Remaining Credits: <span className={totalCost > userCredits ? 'insufficient' : ''}>
              ${(userCredits - totalCost).toFixed(2)}
            </span></div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="buy-button"
            disabled={loading || totalCost > userCredits || quantity <= 0 || quantity > stockInfo.quantity}
          >
            {loading ? 'Processing...' : 'Buy Stock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BuyStock;
