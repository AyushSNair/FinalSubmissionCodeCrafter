import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Recommendations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState({
    stocks: [],
    bonds: [],
    insurance: []
  });
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        // Fetch user stats and portfolio data
        const [userStatsRes, stocksRes, bondsRes, insuranceRes] = await Promise.all([
          axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`),
          axios.get(`${API_URL}/api/stocks`),
          axios.get(`${API_URL}/api/bonds`),
          axios.get(`${API_URL}/api/insurance`)
        ]);

        setUserStats(userStatsRes.data);

        // Generate recommendations based on user's portfolio and available investments
        const stockRecs = generateStockRecommendations(stocksRes.data, userStatsRes.data);
        const bondRecs = generateBondRecommendations(bondsRes.data, userStatsRes.data);
        const insuranceRecs = generateInsuranceRecommendations(insuranceRes.data, userStatsRes.data);

        setRecommendations({
          stocks: stockRecs,
          bonds: bondRecs,
          insurance: insuranceRecs
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchRecommendations();
    }
  }, [user?.email]);

  const generateStockRecommendations = (stocks, userStats) => {
    // Filter and sort stocks based on various criteria
    return stocks
      .filter(stock => {
        // Filter out stocks the user already owns
        const isOwned = userStats.currentHoldings > 0;
        // Filter based on available quantity
        const hasAvailableQuantity = stock.quantity > 0;
        // Filter based on user's available credits
        const isAffordable = stock.currentPrice <= userStats.currentCredits;
        
        return !isOwned && hasAvailableQuantity && isAffordable;
      })
      .sort((a, b) => {
        // Sort by a combination of factors:
        // - Price change percentage (higher is better)
        // - Market cap (higher is better)
        // - Volume (higher is better)
        const aScore = (a.changePercent * 0.4) + (Math.log10(a.marketCap) * 0.3) + (Math.log10(a.volume) * 0.3);
        const bScore = (b.changePercent * 0.4) + (Math.log10(b.marketCap) * 0.3) + (Math.log10(b.volume) * 0.3);
        return bScore - aScore;
      })
      .slice(0, 3); // Get top 3 recommendations
  };

  const generateBondRecommendations = (bonds, userStats) => {
    // Filter and sort bonds based on various criteria
    return bonds
      .filter(bond => {
        // Filter based on minimum investment requirement
        const canAffordMinimum = bond.minimumInvestment <= userStats.currentCredits;
        // Filter based on user's risk profile (using credit amount as a proxy)
        const matchesRiskProfile = userStats.currentCredits >= bond.minimumInvestment * 2;
        
        return canAffordMinimum && matchesRiskProfile;
      })
      .sort((a, b) => {
        // Sort by a combination of factors:
        // - Interest rate (higher is better)
        // - Duration (shorter is better for beginners)
        // - Rating (higher is better)
        const aScore = (a.interestRate * 0.4) + ((10 - a.duration) * 0.3) + (getRatingScore(a.rating) * 0.3);
        const bScore = (b.interestRate * 0.4) + ((10 - b.duration) * 0.3) + (getRatingScore(b.rating) * 0.3);
        return bScore - aScore;
      })
      .slice(0, 2); // Get top 2 recommendations
  };

  const generateInsuranceRecommendations = (insurance, userStats) => {
    // Filter and sort insurance based on various criteria
    return insurance
      .filter(policy => {
        // Filter based on monthly premium affordability
        const canAffordPremium = policy.monthlyPremium <= userStats.currentCredits * 0.1; // 10% of credits
        return canAffordPremium;
      })
      .sort((a, b) => {
        // Sort by a combination of factors:
        // - Coverage amount per premium dollar (higher is better)
        // - Term length (longer is better)
        const aCoverageRatio = a.coverageAmount / a.monthlyPremium;
        const bCoverageRatio = b.coverageAmount / b.monthlyPremium;
        return bCoverageRatio - aCoverageRatio;
      })
      .slice(0, 1); // Get top recommendation
  };

  const getRatingScore = (rating) => {
    const ratings = { 'AAA': 10, 'AA': 9, 'A': 8, 'BBB': 7, 'BB': 6, 'B': 5 };
    return ratings[rating] || 0;
  };

  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) return <div className="loading">Loading recommendations...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="recommendations-container">
      <button onClick={handleBack} className="back-button"> Back to Dashboard</button>
      
      <h1>Investment Recommendations</h1>
      
      <div className="recommendations-intro">
        <p>Based on your current portfolio and market analysis, here are our personalized recommendations:</p>
      </div>

      <div className="recommendations-grid">
        {/* Stock Recommendations */}
        <div className="recommendation-section">
          <h2>Recommended Stocks</h2>
          <div className="recommendations-cards">
            {recommendations.stocks.map(stock => (
              <div key={stock.symbol} className="recommendation-card">
                <div className="rec-header">
                  <h3>{stock.name}</h3>
                  <span className="symbol">{stock.symbol}</span>
                </div>
                <div className="rec-details">
                  <div className="detail-item">
                    <span>Current Price:</span>
                    <span>${stock.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span>Change:</span>
                    <span className={stock.changePercent >= 0 ? 'positive' : 'negative'}>
                      {stock.changePercent >= 0 ? '' : ''} {Math.abs(stock.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <span>Market Cap:</span>
                    <span>${formatNumber(stock.marketCap)}</span>
                  </div>
                  <div className="detail-item">
                    <span>Volume:</span>
                    <span>{formatNumber(stock.volume)}</span>
                  </div>
                </div>
                <button 
                  className="action-button"
                  onClick={() => navigate(`/buy-stock/${stock.symbol}`)}
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bond Recommendations */}
        <div className="recommendation-section">
          <h2>Recommended Bonds</h2>
          <div className="recommendations-cards">
            {recommendations.bonds.map(bond => (
              <div key={bond.id} className="recommendation-card">
                <div className="rec-header">
                  <h3>{bond.name}</h3>
                  <span className="type">{bond.type}</span>
                </div>
                <div className="rec-details">
                  <div className="detail-item">
                    <span>Interest Rate:</span>
                    <span>{bond.interestRate}%</span>
                  </div>
                  <div className="detail-item">
                    <span>Duration:</span>
                    <span>{bond.duration} years</span>
                  </div>
                  <div className="detail-item">
                    <span>Min Investment:</span>
                    <span>${formatNumber(bond.minimumInvestment)}</span>
                  </div>
                  <div className="detail-item">
                    <span>Rating:</span>
                    <span className="rating">{bond.rating}</span>
                  </div>
                </div>
                <button 
                  className="action-button"
                  onClick={() => navigate(`/buy-bond/${bond.id}`)}
                >
                  Invest Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Insurance Recommendations */}
        <div className="recommendation-section">
          <h2>Recommended Insurance</h2>
          <div className="recommendations-cards">
            {recommendations.insurance.map(policy => (
              <div key={policy.id} className="recommendation-card">
                <div className="rec-header">
                  <h3>{policy.name}</h3>
                  <span className="type">{policy.type}</span>
                </div>
                <div className="rec-details">
                  <div className="detail-item">
                    <span>Coverage:</span>
                    <span>${formatNumber(policy.coverageAmount)}</span>
                  </div>
                  <div className="detail-item">
                    <span>Monthly Premium:</span>
                    <span>${policy.monthlyPremium.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span>Term Length:</span>
                    <span>{policy.termLength} years</span>
                  </div>
                </div>
                <button 
                  className="action-button"
                  onClick={() => navigate(`/buy-insurance/${policy.id}`)}
                >
                  Get Coverage
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="recommendations-notes">
        <h3>How We Make Recommendations</h3>
        <ul>
          <li>Stock recommendations are based on market performance, company stability, and growth potential</li>
          <li>Bond recommendations consider your investment capacity and balance risk with returns</li>
          <li>Insurance recommendations are tailored to your portfolio value and monthly premium affordability</li>
          <li>All recommendations are personalized based on your current portfolio and available credits</li>
        </ul>
      </div>
    </div>
  );
};

export default Recommendations; 