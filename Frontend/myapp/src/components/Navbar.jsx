import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import '../styles/Navbar.css';
import {
    AppBar,
    Box,
    Toolbar,
    IconButton,
    Typography,
    Menu,
    Container,
    Avatar,
    Button,
    Tooltip,
    MenuItem,
    Modal,
    TextField,
    CircularProgress,
    Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: 800,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    maxHeight: '80vh',
    overflow: 'auto',
    borderRadius: '8px'
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleAskAI = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_URL}/api/ai-insights/market-analysis`, {
        query: aiQuery || 'Provide a market analysis'
      });
      setAiResponse(response.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get AI insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <div className="navbar-brand">
            <Link to="/" className="brand-logo">Investment Portal</Link>
          </div>
          <button className="navbar-menu-btn" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/stocks" className={`nav-link ${isActive('/stocks') ? 'active' : ''}`}>Stocks</Link>
            <Link to="/bonds" className={`nav-link ${isActive('/bonds') ? 'active' : ''}`}>Bonds</Link>
            <Link to="/insurance" className={`nav-link ${isActive('/insurance') ? 'active' : ''}`}>Insurance</Link>
            <Link to="/portfolio" className={`nav-link ${isActive('/portfolio') ? 'active' : ''}`}>Portfolio</Link>
            <Link to="/auto-trading" className={`nav-link ${isActive('/auto-trading') ? 'active' : ''}`}>Auto Trading</Link>
            <Link to="/learning" className={`nav-link ${isActive('/learning') ? 'active' : ''}`}>Learning</Link>
          </div>
          <div className="navbar-auth">
            {user ? (
              <>
                <span className="user-credits">Credits: ${user.credits.toFixed(2)}</span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>Login</Link>
                <Link to="/register" className={`nav-link ${isActive('/register') ? 'active' : ''}`}>Register</Link>
              </>
            )}
          </div>
        </Toolbar>
      </Container>
      <Modal
        open={openAI}
        onClose={() => setOpenAI(false)}
        aria-labelledby="ai-insights-modal"
      >
        <Box sx={style}>
          <Typography variant="h5" gutterBottom sx={{ color: '#333', fontWeight: 600 }}>
            AI Market Insights
          </Typography>
          
          <Box sx={{ mt: 3, mb: 4 }}>
            <TextField
              fullWidth
              label="Ask about the market, stocks, or your portfolio"
              variant="outlined"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Example: What's the current market sentiment? How should I adjust my portfolio?"
            />
            <Button
              variant="contained"
              onClick={handleAskAI}
              disabled={loading}
              sx={{
                backgroundColor: '#007bff',
                '&:hover': {
                  backgroundColor: '#0056b3'
                }
              }}
              startIcon={<SmartToyIcon />}
            >
              Get AI Analysis
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress sx={{ color: '#007bff' }} />
            </Box>
          )}

          {error && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                mt: 2, 
                backgroundColor: '#fff3f3',
                color: '#d32f2f',
                borderRadius: '4px'
              }}
            >
              <Typography>{error}</Typography>
            </Paper>
          )}

          {aiResponse && (
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                mt: 2, 
                whiteSpace: 'pre-line',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}
            >
              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                {aiResponse}
              </Typography>
            </Paper>
          )}
        </Box>
      </Modal>
    </AppBar>
  );
};

export default Navbar; 