import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Portfolio.css';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, Legend
} from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Portfolio = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [totalBondValue, setTotalBondValue] = useState(0);
  const [monthlyPremiums, setMonthlyPremiums] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const navigate = useNavigate();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const calculateRiskScore = (stocks, bonds, insurance) => {
    // Risk scoring based on portfolio composition and diversification
    let score = 0;
    const totalValue = totalStockValue + totalBondValue;
    
    if (totalValue === 0) return 0;

    // Asset allocation risk (0-40 points)
    const stockPercentage = totalStockValue / totalValue;
    score += stockPercentage * 40; // Higher stock percentage = higher risk

    // Diversification risk (0-30 points)
    const uniqueSectors = new Set(stocks.map(stock => stock.sector)).size;
    score += Math.max(0, 30 - (uniqueSectors * 5)); // More sectors = lower risk

    // Bond quality risk (0-20 points)
    const avgBondRating = bonds.reduce((sum, bond) => {
      const ratingScore = { 'AAA': 0, 'AA': 5, 'A': 10, 'BBB': 15, 'BB': 20, 'B': 25 };
      return sum + (ratingScore[bond.rating] || 0);
    }, 0) / (bonds.length || 1);
    score += avgBondRating;

    // Insurance coverage (0-10 points)
    const hasInsurance = insurance.length > 0;
    score += hasInsurance ? 0 : 10;

    return Math.min(100, Math.round(score));
  };

  const getRiskLevel = (score) => {
    if (score < 20) return { level: 'Very Low', color: '#4CAF50' };
    if (score < 40) return { level: 'Low', color: '#8BC34A' };
    if (score < 60) return { level: 'Moderate', color: '#FFC107' };
    if (score < 80) return { level: 'High', color: '#FF9800' };
    return { level: 'Very High', color: '#F44336' };
  };

  const fetchPortfolio = async () => {
    try {
      const [stocksRes, bondsRes, insuranceRes] = await Promise.all([
        axios.get(`${API_URL}/api/stocks/portfolio/${user.email}`),
        axios.get(`${API_URL}/api/bonds/portfolio/${user.email}`),
        axios.get(`${API_URL}/api/insurance/portfolio/${user.email}`)
      ]);

      setPortfolio(stocksRes.data);
      setBonds(bondsRes.data);
      setInsurance(insuranceRes.data);

      // Calculate total portfolio values
      const stocksTotal = stocksRes.data.reduce((sum, stock) => sum + (stock.quantity * stock.currentPrice), 0);
      const bondsTotal = bondsRes.data.reduce((sum, bond) => sum + bond.investmentValue, 0);
      const premiumsTotal = insuranceRes.data.reduce((sum, ins) => sum + ins.monthlyPremium, 0);
      
      setTotalStockValue(stocksTotal);
      setTotalBondValue(bondsTotal);
      setMonthlyPremiums(premiumsTotal);

      // Calculate risk score
      const riskScore = calculateRiskScore(stocksRes.data, bondsRes.data, insuranceRes.data);
      setRiskScore(riskScore);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load portfolio data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [user.email]);

  const handleBack = () => {
    navigate('/');
  };

  // Data for portfolio distribution pie chart
  const portfolioDistribution = [
    { name: 'Stocks', value: totalStockValue },
    { name: 'Bonds', value: totalBondValue },
    { name: 'Insurance', value: monthlyPremiums * 12 } // Annualized insurance cost
  ];

  return (
    <div className="portfolio-container">
      <button className="back-button" onClick={handleBack}>
        ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back to Home
      </button>
      
      <h2 className="portfolio-header">Your Portfolio</h2>
      
      {loading ? (
        <div className="loading-spinner">Loading portfolio data...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : portfolio.length === 0 && bonds.length === 0 && insurance.length === 0 ? (
        <div className="empty-portfolio">
          <p>You haven't made any investments yet.</p>
          <div className="start-investing-buttons">
            <Link to="/stocks">
              <button className="buy-first-stock-btn">Trade Stocks</button>
            </Link>
            <Link to="/bonds">
              <button className="buy-first-bond-btn">Invest in Bonds</button>
            </Link>
            <Link to="/insurance">
              <button className="buy-first-insurance-btn">Get Insurance</button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="portfolio-content">
          <div className="portfolio-summary">
            <div className="summary-card">
              <div className="summary-label">Total Portfolio Value</div>
              <div className="summary-value">${(totalStockValue + totalBondValue).toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Stocks Value</div>
              <div className="summary-value">${totalStockValue.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Bonds Value</div>
              <div className="summary-value">${totalBondValue.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Monthly Insurance Premiums</div>
              <div className="summary-value">${monthlyPremiums.toFixed(2)}</div>
            </div>
          </div>

          {/* Portfolio Analysis Section */}
          <div className="portfolio-analysis">
            <h3 className="section-header">Portfolio Analysis</h3>
            <div className="analysis-grid">
              {/* Portfolio Distribution Chart */}
              <div className="chart-card">
                <h4>Asset Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {portfolioDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Analysis Card */}
              <div className="risk-analysis-card">
                <h4>Risk Analysis</h4>
                <div className="risk-score">
                  <div className="risk-meter">
                    <div 
                      className="risk-fill" 
                      style={{ 
                        width: `${riskScore}%`,
                        backgroundColor: getRiskLevel(riskScore).color 
                      }}
                    ></div>
                  </div>
                  <div className="risk-label">
                    Risk Level: <span style={{ color: getRiskLevel(riskScore).color }}>
                      {getRiskLevel(riskScore).level}
                    </span>
                  </div>
                </div>
                <div className="risk-factors">
                  <h5>Risk Factors:</h5>
                  <ul>
                    <li>Asset Allocation: {((totalStockValue / (totalStockValue + totalBondValue)) * 100).toFixed(1)}% in Stocks</li>
                    <li>Diversification: {new Set(portfolio.map(stock => stock.sector)).size} Sectors</li>
                    <li>Bond Quality: {bonds.length > 0 ? 'Mixed Ratings' : 'No Bonds'}</li>
                    <li>Insurance Coverage: {insurance.length > 0 ? 'Protected' : 'Limited'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {portfolio.length > 0 && (
            <div className="portfolio-section">
              <h3 className="section-header">Stocks</h3>
              <div className="portfolio-table-container">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th>Quantity</th>
                      <th>Current Price</th>
                      <th>Change</th>
                      <th>Total Value</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(stock => (
                      <tr key={stock.symbol}>
                        <td className="stock-symbol">{stock.symbol}</td>
                        <td className="stock-name">{stock.name}</td>
                        <td className="stock-quantity">{stock.quantity.toLocaleString()}</td>
                        <td className="stock-price">${stock.currentPrice.toFixed(2)}</td>
                        <td className={stock.change >= 0 ? "price-up" : "price-down"}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                        </td>
                        <td className="stock-value">${(stock.quantity * stock.currentPrice).toFixed(2)}</td>
                        <td>
                          <Link to={`/sell/${stock.symbol}`}>
                            <button className="sell-btn">Sell</button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bonds.length > 0 && (
            <div className="portfolio-section">
              <h3 className="section-header">Bonds</h3>
              <div className="portfolio-table-container">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Investment</th>
                      <th>Interest Rate</th>
                      <th>Duration</th>
                      <th>Maturity Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonds.map(bond => (
                      <tr key={bond.id}>
                        <td className="bond-name">{bond.name}</td>
                        <td className="bond-type">{bond.type}</td>
                        <td className="bond-investment">${bond.investmentValue.toLocaleString()}</td>
                        <td className="bond-rate">{bond.interestRate}%</td>
                        <td className="bond-duration">{bond.duration} years</td>
                        <td className="bond-maturity">
                          ${(bond.investmentValue * (1 + bond.interestRate/100) ** bond.duration).toFixed(2)}
                        </td>
                        <td>
                          <button className="hold-btn" disabled>Holding</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {insurance.length > 0 && (
            <div className="portfolio-section">
              <h3 className="section-header">Insurance</h3>
              <div className="portfolio-table-container">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Provider</th>
                      <th>Coverage Amount</th>
                      <th>Monthly Premium</th>
                      <th>Next Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insurance.map(ins => (
                      <tr key={ins.id}>
                        <td className="insurance-name">{ins.name}</td>
                        <td className="insurance-type">{ins.type}</td>
                        <td className="insurance-provider">{ins.provider}</td>
                        <td className="insurance-coverage">${ins.coverageAmount.toLocaleString()}</td>
                        <td className="insurance-premium">${ins.monthlyPremium.toLocaleString()}</td>
                        <td className="insurance-payment">
                          {new Date(ins.nextPaymentDate).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`status-badge ${ins.status.toLowerCase()}`}>
                            {ins.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
