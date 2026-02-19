import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Stocks.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Stocks = () => {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchStocks = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/stocks`);
      setStocks(res.data);
      setFilteredStocks(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load stocks data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStocks, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStocks(filtered);
    }
  }, [searchTerm, stocks]);

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

  return (
    <div className="stocks-container">
      <button className="back-button" onClick={handleBack}>
        Back to Home
      </button>
      
      <h2 className="stocks-header">Available Stocks</h2>
      
      <div className="stocks-controls">
        <div className="stocks-search">
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="loading-spinner">Loading stocks data...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : filteredStocks.length === 0 ? (
        <div className="empty-stocks">No stocks found matching your search criteria</div>
      ) : (
        <div className="stock-table-container">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Price</th>
                <th>Change</th>
                <th>Volume</th>
                <th>Market Cap</th>
                <th>Quantity Available</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map(stock => (
                <tr key={stock._id}>
                  <td className="stock-symbol">{stock.symbol}</td>
                  <td className="stock-name">{stock.name}</td>
                  <td className="stock-price">${stock.price.toFixed(2)}</td>
                  <td className={stock.change >= 0 ? "price-up" : "price-down"}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                  </td>
                  <td>{formatNumber(stock.volume)}</td>
                  <td>${formatNumber(stock.marketCap)}</td>
                  <td className="stock-quantity">{stock.quantity.toLocaleString()}</td>
                  <td>
                    <div className="stock-actions">
                      <Link to={`/buy/${stock.symbol}`}>
                        <button className="action-btn buy-btn">Buy </button>
                      </Link>
                      <Link to={`/stock/${stock.symbol}`}>
                        <button className="action-btn details-btn">Details </button>
                      </Link>
                      <Link to={`/prediction/${stock.symbol}`}>
                        <button className="action-btn predict-btn">Predict </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Stocks;
