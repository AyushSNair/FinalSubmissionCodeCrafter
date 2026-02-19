import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SellStock = () => {
  const { symbol } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stockInfo, setStockInfo] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [ownedQuantity, setOwnedQuantity] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch stock info
        const stockResponse = await axios.get(`${API_URL}/api/stocks/intraday/${symbol}`);
        setStockInfo(stockResponse.data);

        // Fetch user's portfolio to get owned quantity
        const portfolioResponse = await axios.get(`${API_URL}/api/stocks/portfolio/${user.email}`);
        const ownedStock = portfolioResponse.data.find(s => s.symbol === symbol);
        setOwnedQuantity(ownedStock ? ownedStock.quantity : 0);

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

  const handleSell = async (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (quantity > ownedQuantity) {
      setError(`You only own ${ownedQuantity} shares`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/stocks/sell`, { 
        email: user.email, 
        symbol, 
        quantity: parseInt(quantity) 
      });
      
      setSuccess(`Stock sold successfully! Earned $${response.data.earnedCredits.toFixed(2)}`);
      setUserCredits(response.data.newCreditBalance);
      setOwnedQuantity(prev => prev - parseInt(quantity));
      setLoading(false);
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/portfolio');
      }, 1500);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Error selling stock");
    }
  };

  const handleBack = () => {
    navigate('/portfolio');
  };

  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const totalEarnings = stockInfo ? (quantity * stockInfo.currentPrice).toFixed(2) : 0;

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stockInfo) return <div className="error">Stock not found</div>;

  return (
    <div className="sell-stock-container">
      <button onClick={handleBack} className="back-button">Back</button>
      
      <div className="stock-info-header">
        <h2>{stockInfo.name} ({stockInfo.symbol})</h2>
        <div className="user-credits">
          Current Credits: ${userCredits.toFixed(2)}
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
            <span>Your Holdings:</span> {ownedQuantity} shares
          </div>
        </div>

        <form onSubmit={handleSell} className="sell-form">
          <div className="form-group">
            <label>Quantity to Sell:</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={ownedQuantity}
              required
            />
          </div>

          <div className="earnings-preview">
            <div>Total Earnings: <span className="earnings">${totalEarnings}</span></div>
            <div>New Credit Balance: <span className="earnings">
              ${(userCredits + parseFloat(totalEarnings)).toFixed(2)}
            </span></div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="sell-button"
            disabled={loading || quantity <= 0 || quantity > ownedQuantity}
          >
            {loading ? 'Processing...' : 'Sell Stock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellStock;
