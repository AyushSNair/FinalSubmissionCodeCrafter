import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import './ProfitEstimation.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ProfitEstimation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolioData, setPortfolioData] = useState(null);
  const [estimations, setEstimations] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch portfolio data including stocks, bonds, and insurance
        const [stocksRes, bondsRes, insuranceRes, userStatsRes] = await Promise.all([
          axios.get(`${API_URL}/api/stocks/portfolio/${user.email}`),
          axios.get(`${API_URL}/api/bonds/portfolio/${user.email}`),
          axios.get(`${API_URL}/api/insurance/portfolio/${user.email}`),
          axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`)
        ]);

        const portfolioData = {
          stocks: stocksRes.data,
          bonds: bondsRes.data,
          insurance: insuranceRes.data,
          userStats: userStatsRes.data
        };

        setPortfolioData(portfolioData);
        
        // Calculate estimations
        const stocksValue = portfolioData.stocks.reduce((total, stock) => 
          total + (stock.quantity * stock.currentPrice), 0);
        
        const bondsValue = portfolioData.bonds.reduce((total, bond) => 
          total + bond.investmentValue, 0);
        
        const insuranceValue = portfolioData.insurance.reduce((total, insurance) => 
          total + insurance.coverageAmount, 0);

        // Calculate projected returns
        const stockReturns = calculateStockReturns(portfolioData.stocks);
        const bondReturns = calculateBondReturns(portfolioData.bonds);
        const insuranceReturns = calculateInsuranceReturns(portfolioData.insurance);

        setEstimations({
          currentValue: {
            stocks: stocksValue,
            bonds: bondsValue,
            insurance: insuranceValue,
            total: stocksValue + bondsValue + insuranceValue
          },
          projectedReturns: {
            monthly: stockReturns.monthly + bondReturns.monthly + insuranceReturns.monthly,
            yearly: stockReturns.yearly + bondReturns.yearly + insuranceReturns.yearly,
            fiveYear: stockReturns.fiveYear + bondReturns.fiveYear + insuranceReturns.fiveYear
          },
          distribution: [
            { name: 'Stocks', value: stocksValue },
            { name: 'Bonds', value: bondsValue },
            { name: 'Insurance', value: insuranceValue }
          ],
          timelineData: generateTimelineData(stockReturns, bondReturns, insuranceReturns)
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError('Failed to load portfolio data');
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchData();
    }
  }, [user?.email]);

  const calculateStockReturns = (stocks) => {
    const totalInvestment = stocks.reduce((total, stock) => 
      total + (stock.quantity * stock.currentPrice), 0);
    
    // Assuming average stock market return of 10% annually
    const yearlyReturn = totalInvestment * 0.10;
    
    return {
      monthly: yearlyReturn / 12,
      yearly: yearlyReturn,
      fiveYear: yearlyReturn * 5
    };
  };

  const calculateBondReturns = (bonds) => {
    const totalReturns = bonds.reduce((total, bond) => {
      const yearlyReturn = bond.investmentValue * (bond.interestRate / 100);
      return total + yearlyReturn;
    }, 0);

    return {
      monthly: totalReturns / 12,
      yearly: totalReturns,
      fiveYear: totalReturns * 5
    };
  };

  const calculateInsuranceReturns = (insurance) => {
    // For insurance, we'll calculate the potential savings/returns from coverage
    const totalPremiums = insurance.reduce((total, policy) => 
      total + policy.monthlyPremium * 12, 0);
    
    return {
      monthly: -totalPremiums / 12, // Negative because it's an expense
      yearly: -totalPremiums,
      fiveYear: -totalPremiums * 5
    };
  };

  const generateTimelineData = (stockReturns, bondReturns, insuranceReturns) => {
    const timelineData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
      timelineData.push({
        name: months[i],
        Stocks: stockReturns.monthly * (i + 1),
        Bonds: bondReturns.monthly * (i + 1),
        Insurance: insuranceReturns.monthly * (i + 1),
        Total: (stockReturns.monthly + bondReturns.monthly + insuranceReturns.monthly) * (i + 1)
      });
    }
    
    return timelineData;
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) return <div className="loading">Loading profit estimations...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!estimations) return <div className="error">No data available</div>;

  return (
    <div className="profit-estimation-container">
      <button onClick={handleBack} className="back-button">Back to Dashboard</button>
      
      <h1>Investment Profit Estimation</h1>
      
      <div className="estimation-summary">
        <div className="summary-card">
          <h3>Current Portfolio Value</h3>
          <div className="value">${estimations.currentValue.total.toFixed(2)}</div>
        </div>
        
        <div className="summary-card">
          <h3>Projected Monthly Returns</h3>
          <div className="value">${estimations.projectedReturns.monthly.toFixed(2)}</div>
        </div>
        
        <div className="summary-card">
          <h3>Projected Yearly Returns</h3>
          <div className="value">${estimations.projectedReturns.yearly.toFixed(2)}</div>
        </div>
        
        <div className="summary-card">
          <h3>5-Year Projection</h3>
          <div className="value">${estimations.projectedReturns.fiveYear.toFixed(2)}</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Portfolio Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estimations.distribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {estimations.distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Projected Returns Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={estimations.timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Total" stroke="#8884d8" />
              <Line type="monotone" dataKey="Stocks" stroke="#82ca9d" />
              <Line type="monotone" dataKey="Bonds" stroke="#ffc658" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Investment Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estimations.distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8">
                {estimations.distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="estimation-notes">
        <h3>Investment Insights</h3>
        <ul>
          <li>Stock returns are estimated based on historical market average of 10% annually</li>
          <li>Bond returns are calculated using the actual interest rates of your bond investments</li>
          <li>Insurance values represent potential coverage benefits minus premium costs</li>
          <li>All projections are estimates and actual returns may vary</li>
        </ul>
      </div>
    </div>
  );
};

export default ProfitEstimation; 