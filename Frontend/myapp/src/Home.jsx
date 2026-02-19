import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './App.css';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
} from '@mui/material';
import {
    TrendingUp,
    AccountBalance,
    ShowChart,
    SmartToy,
    LocalAtm,
    Security,
    School,
    AutoGraph,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingCredits, setIsEditingCredits] = useState(false);
  const [newCredits, setNewCredits] = useState('');

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
        setUserStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError('Failed to load user statistics');
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchUserStats();
    }
  }, [user?.email]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpdateCredits = async () => {
    try {
      const credits = parseFloat(newCredits);
      if (isNaN(credits) || credits <= 0) {
        setError('Please enter a valid positive number');
        return;
      }

      const amountInPaise = Math.round(credits * 100);
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        setError("Failed to load Razorpay SDK. Please try again.");
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
            await axios.post(`${API_URL}/api/users/update-credits`, {
              email: user.email,
              credits
            });

            // Refresh user stats
            const response = await axios.get(`${API_URL}/api/stocks/user-stats/${user.email}`);
            setUserStats(response.data);
            setIsEditingCredits(false);
            setNewCredits('');
            setError('');
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
      setError(err.response?.data?.message || 'Failed to update credits');
    }
  };

  const dashboardItems = [
    {
      title: 'Stocks',
      description: 'View and trade stocks in real-time',
      icon: <ShowChart sx={{ fontSize: 40, color: '#2196f3' }} />,
      path: '/stocks',
      color: '#bbdefb'
    },
    {
      title: 'Portfolio',
      description: 'Manage your investment portfolio',
      icon: <AccountBalance sx={{ fontSize: 40, color: '#4caf50' }} />,
      path: '/portfolio',
      color: '#c8e6c9'
    },
    {
      title: 'Bonds',
      description: 'Explore and invest in bonds',
      icon: <LocalAtm sx={{ fontSize: 40, color: '#ff9800' }} />,
      path: '/bonds',
      color: '#ffe0b2'
    },
    {
      title: 'Insurance',
      description: 'Browse insurance options',
      icon: <Security sx={{ fontSize: 40, color: '#9c27b0' }} />,
      path: '/insurance',
      color: '#e1bee7'
    },
    {
      title: 'Learning',
      description: 'Educational resources for investors',
      icon: <School sx={{ fontSize: 40, color: '#f44336' }} />,
      path: '/learning',
      color: '#ffcdd2'
    },
    {
      title: 'Auto Trading',
      description: 'Set up automated trading strategies',
      icon: <AutoGraph sx={{ fontSize: 40, color: '#00bcd4' }} />,
      path: '/auto-trading',
      color: '#b2ebf2'
    },
    {
      title: 'Gemini AI Insights',
      description: 'Get AI-powered market analysis and investment recommendations',
      icon: <SmartToy sx={{ fontSize: 40, color: '#1a237e' }} />,
      path: '/gemini-insights',
      color: '#c5cae9',
      featured: true
    }
  ];

  return (
    <div className="home-container">
      <header className="dashboard-header">
        <h1>Welcome to Your Dashboard</h1>
        <div className="user-info">
          <span>Hello, {user?.name || user?.email || 'User'}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      
      {/* User Statistics Section */}
      <div className="user-stats-container">
        <h2>Your Investment Summary</h2>
        
        {loading ? (
          <div className="loading-spinner">Loading statistics...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : userStats ? (
          <div className="stats-grid">
            <div 
              className="stat-card" 
              onClick={() => setIsEditingCredits(true)}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-icon">💰</div>
              {isEditingCredits ? (
                <div className="stat-edit">
                  <input
                    type="number"
                    value={newCredits}
                    onChange={(e) => setNewCredits(e.target.value)}
                    placeholder="Enter amount in INR"
                    min="1"
                    step="0.01"
                    autoFocus
                  />
                  <div className="stat-edit-buttons">
                    <button onClick={handleUpdateCredits}>Add Credits</button>
                    <button onClick={() => {
                      setIsEditingCredits(false);
                      setNewCredits('');
                      setError('');
                    }}>Cancel</button>
                  </div>
                  {error && <div className="error-message">{error}</div>}
                </div>
              ) : (
                <>
                  <div className="stat-value">${userStats.currentCredits.toFixed(2)}</div>
                  <div className="stat-label">Available Credits (Click to Add)</div>
                </>
              )}
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-value">{userStats.totalPurchased}</div>
              <div className="stat-label">Stocks Purchased</div>
            </div>
            
            {/* <div className="stat-card">
              <div className="stat-icon">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â°</div>
              <div className="stat-value">{userStats.totalSold}</div>
              <div className="stat-label">Stocks Sold</div>
            </div> */}
            
            <div className="stat-card" onClick={() => navigate('/portfolio')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon">📊</div>
              <div className="stat-value">{userStats.currentHoldings}</div>
              <div className="stat-label">Current Holdings</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💼</div>
              <div className="stat-value">${userStats.portfolioValue.toFixed(2)}</div>
              <div className="stat-label">Portfolio Value</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💎</div>
              <div className="stat-value">${userStats.netWorth.toFixed(2)}</div>
              <div className="stat-label">Net Worth</div>
            </div>
          </div>
        ) : (
          <p>No statistics available</p>
        )}
      </div>
      
      <div className="dashboard-content">
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
            Investment Dashboard
          </Typography>

          <Grid container spacing={3}>
            {dashboardItems.map((item, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3
                    },
                    ...(item.featured && {
                      border: '2px solid #1a237e',
                      boxShadow: '0 4px 8px rgba(26, 35, 126, 0.2)'
                    })
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <CardContent sx={{ 
                    flexGrow: 1,
                    background: `linear-gradient(45deg, ${item.color}, white)`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      mb: 2
                    }}>
                      {item.icon}
                      <Typography variant="h6" component="h2">
                        {item.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                    {item.featured && (
                      <Button 
                        variant="contained" 
                        color="primary"
                        sx={{ mt: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(item.path);
                        }}
                      >
                        Try AI Insights
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </div>
    </div>
  );
};

export default Home; 