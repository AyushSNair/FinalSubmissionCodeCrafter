import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import './StockDetails.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const StockDetails = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [timeRange, setTimeRange] = useState('1D');
  const [afterHoursPrice, setAfterHoursPrice] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    state: 'disconnected',
    lastError: null,
    attempts: 0,
    url: API_URL
  });

  // Generate sample chart data if real data is not available
  const generateSampleChartData = () => {
    const data = [];
    const basePrice = 100;
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() - (23 - i) * 3600000);
      data.push({
        time: time.toLocaleTimeString(),
        price: basePrice + Math.random() * 10 - 5
      });
    }
    return data;
  };

  // Function to log connection details
  const logConnectionDetails = (event, details = {}) => {
    const timestamp = new Date().toISOString();
    const connectionInfo = {
      timestamp,
      event,
      url: connectionStatus.url,
      readyState: socket?.connected ? 'CONNECTED' : 'DISCONNECTED',
      transportType: socket?.io?.engine?.transport?.name,
      attempts: connectionStatus.attempts,
      ...details
    };
    
    console.log('WebSocket Connection Details:', connectionInfo);
    return connectionInfo;
  };

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching stock data for symbol: ${symbol}`);
        
        // Test server availability first
        try {
          await axios.get(`${connectionStatus.url}/health`);
          console.log('Server health check passed');
        } catch (healthError) {
          console.error('Server health check failed:', healthError);
          throw new Error('Server is not reachable');
        }

        const response = await axios.get(`${connectionStatus.url}/api/stocks/intraday/${symbol}`);
        console.log('Stock data received:', response.data);
        
        // Check if chartData is empty or missing
        if (!response.data.chartData || response.data.chartData.length === 0) {
          console.log('No chart data received, generating sample data');
          response.data.chartData = generateSampleChartData();
        }
        
        // Ensure chartData exists, if not use sample data
        const data = {
          ...response.data,
          chartData: response.data.chartData
        };
        
        setStockData(data);
        
        if (data.postMarketPrice) {
          setAfterHoursPrice(data.postMarketPrice);
        }
        
        setLoading(false);
        setError(''); // Clear any existing errors
      } catch (err) {
        console.error('Error fetching stock data:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          url: err.config?.url,
          method: err.config?.method
        });
        
        // Set sample data even on error
        const sampleData = {
          name: symbol,
          symbol: symbol,
          currentPrice: 100,
          change: 0,
          changePercent: 0,
          chartData: generateSampleChartData()
        };
        
        console.log('Using sample data:', sampleData);
        setStockData(sampleData);
        setError('Failed to load real-time data. Showing sample data.');
        setLoading(false);
      }
    };

    fetchStockData();

    // WebSocket connection setup with enhanced error handling
    const newSocket = io(connectionStatus.url, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      autoConnect: false
    });

    // Pre-connection setup
    newSocket.on('connect_error', (error) => {
      const errorDetails = {
        type: error.type,
        message: error.message,
        description: error.description,
        context: {
          transport: newSocket.io?.engine?.transport?.name,
          protocol: window.location.protocol,
          hostname: window.location.hostname
        }
      };
      
      console.error('WebSocket connection error:', errorDetails);
      
      setConnectionStatus(prev => ({
        ...prev,
        state: 'error',
        lastError: errorDetails,
        attempts: prev.attempts + 1
      }));
      
      setSocketConnected(false);
      setError(`Connection failed: ${error.message}. Retrying...`);
      
      // Log CORS-specific issues
      if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        console.error('CORS Issue Detected:', {
          origin: window.location.origin,
          targetUrl: connectionStatus.url,
          headers: error.headers
        });
      }
    });

    newSocket.on('connect', () => {
      const connectionDetails = logConnectionDetails('connect', {
        transport: newSocket.io.engine.transport.name,
        protocol: newSocket.io.engine.protocol
      });

      setConnectionStatus(prev => ({
        ...prev,
        state: 'connected',
        lastError: null,
        attempts: 0
      }));

      setSocketConnected(true);
      setError('');
      newSocket.emit('subscribe', { symbol, timeRange });
    });

    newSocket.on('disconnect', (reason) => {
      logConnectionDetails('disconnect', { reason });
      
      setConnectionStatus(prev => ({
        ...prev,
        state: 'disconnected',
        lastError: { message: reason }
      }));

      setSocketConnected(false);
      setError(`Connection lost (${reason}). Attempting to reconnect...`);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      logConnectionDetails('reconnect_attempt', { attemptNumber });
      
      setConnectionStatus(prev => ({
        ...prev,
        state: 'reconnecting',
        attempts: attemptNumber
      }));
      
      setError(`Reconnection attempt ${attemptNumber}/5...`);
    });

    newSocket.on('reconnect_failed', () => {
      const details = logConnectionDetails('reconnect_failed');
      
      setConnectionStatus(prev => ({
        ...prev,
        state: 'failed',
        lastError: { message: 'Maximum reconnection attempts reached' }
      }));
      
      setError('Failed to reconnect after multiple attempts. Please refresh the page.');
    });

    newSocket.on('stockUpdate', (data) => {
      logConnectionDetails('stockUpdate', { 
        dataReceived: !!data,
        timestamp: new Date().toISOString()
      });
      
      setRetrying(false);
      setError('');
      
      setStockData(prevData => ({
        ...prevData,
        ...data,
        chartData: data.chartData?.length > 0 ? data.chartData : (prevData?.chartData || [])
      }));
      
      if (data.postMarketPrice) {
        setAfterHoursPrice(data.postMarketPrice);
      }
    });

    newSocket.on('stockError', (error) => {
      const errorDetails = {
        message: error.message,
        details: error.details,
        retrying: error.retrying,
        timestamp: new Date().toISOString()
      };
      
      console.error('Stock data error:', errorDetails);
      
      setRetrying(error.retrying || false);
      setError(error.details ? `${error.message}: ${error.details}` : error.message);
    });

    // Add handler for time range changes
    const handleTimeRangeChange = (newTimeRange) => {
      setTimeRange(newTimeRange);
      if (newSocket && newSocket.connected) {
        newSocket.emit('subscribe', { symbol, timeRange: newTimeRange });
      }
    };

    // Initial connection
    try {
      console.log('Initiating WebSocket connection to:', connectionStatus.url);
      newSocket.connect();
      setSocket(newSocket);
      
      // Initial subscription with time range
      newSocket.on('connect', () => {
        newSocket.emit('subscribe', { symbol, timeRange });
      });
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setError('Failed to initialize connection');
    }

    return () => {
      if (newSocket) {
        logConnectionDetails('cleanup');
        newSocket.emit('unsubscribe');
        newSocket.disconnect();
      }
    };
  }, [symbol]);

  // Add effect for time range changes
  useEffect(() => {
    if (socket && socket.connected && timeRange) {
      socket.emit('subscribe', { symbol, timeRange });
    }
  }, [timeRange]);

  const handleBack = () => navigate('/stocks');
  const handleFollow = () => setIsFollowing(!isFollowing);
  const handleCompare = () => navigate(`/stocks/compare/${symbol}`);
  
  const formatPrice = (price) => price ? `$${price.toFixed(2)}` : 'N/A';
  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const timeRangeOptions = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  // Only show error banner if there's an error and no data
  const shouldShowError = error && !stockData;

  // Add function to format X-axis labels
  const formatXAxisTick = (time) => {
    if (!time) return '';
    
    switch (timeRange) {
      case '1D':
        return time; // Keep the HH:MM format
      case '1W':
        const parts = time.split(',');
        if (parts.length >= 2) {
          const [weekday, dateTime] = parts;
          return `${weekday.trim()} ${dateTime.trim()}`;
        }
        return time;
      default:
        return time;
    }
  };

  // Add function to format tooltip labels
  const formatTooltipLabel = (label) => {
    if (!label) return '';
    
    switch (timeRange) {
      case '1D':
        return `Time: ${label}`;
      case '1W':
        return `${label}`;
      default:
        return `Date: ${label}`;
    }
  };

  return (
    <div className="stock-dashboard">
      <div className="dashboard-header">
        <button className="btn btn-outline-light" onClick={handleBack}>
          ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back
        </button>
        <div className="header-actions">
          <button 
            className={`btn ${isFollowing ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={handleFollow}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button className="btn btn-outline-light" onClick={handleCompare}>
            Compare
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : shouldShowError ? (
        <div className="alert alert-danger">
          {error}
          {connectionStatus.lastError && (
            <div className="mt-2 small text-muted">
              Last Error: {connectionStatus.lastError.message}
              {connectionStatus.attempts > 0 && ` (Attempt ${connectionStatus.attempts}/5)`}
            </div>
          )}
        </div>
      ) : stockData ? (
        <>
          <div className="stock-info-panel">
            {error && (
              <div className={`alert ${retrying ? 'alert-warning' : 'alert-danger'} alert-dismissible fade show`}>
                {error}
                {retrying && (
                  <div className="d-flex align-items-center mt-2">
                    <div className="spinner-border spinner-border-sm text-warning me-2" role="status">
                      <span className="visually-hidden">Retrying...</span>
                    </div>
                    <small>
                      Attempting to reconnect... 
                      {connectionStatus.attempts > 0 && ` (Attempt ${connectionStatus.attempts}/5)`}
                    </small>
                  </div>
                )}
                <button type="button" className="btn-close" onClick={() => setError('')}></button>
              </div>
            )}
            
            <div className="stock-primary-info">
              <h1>{stockData?.name || 'Unknown'} ({stockData?.symbol || ''})</h1>
              <div className="price-container">
                <h2 className="current-price">{formatPrice(stockData?.currentPrice)}</h2>
                <span className={`price-change ${stockData?.change >= 0 ? 'positive' : 'negative'}`}>
                  {stockData?.change >= 0 ? '+' : ''}{formatPrice(stockData?.change)}
                  ({stockData?.changePercent?.toFixed(2)}%)
                </span>
                {!socketConnected && (
                  <span className="badge bg-warning text-dark ms-2">
                    {retrying ? 'Reconnecting...' : 'Live updates paused'}
                  </span>
                )}
              </div>
              {afterHoursPrice && (
                <div className="after-hours">
                  After Hours: {formatPrice(afterHoursPrice)}
                </div>
              )}
            </div>

            <div className="chart-controls">
              <div className="time-range-selector">
                {timeRangeOptions.map(range => (
                  <button
                    key={range}
                    className={`btn btn-sm ${timeRange === range ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setTimeRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <div className="chart-toggles">
                <button
                  className={`btn btn-sm ${showEvents ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setShowEvents(!showEvents)}
                >
                  Key Events
                </button>
              </div>
            </div>

            <div className="chart-container">
              {stockData && stockData.chartData && stockData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={stockData.chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2196F3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: '#fff' }}
                      stroke="#666"
                      interval={timeRange === '1W' ? 2 : 'preserveEnd'}
                      angle={timeRange === '1W' ? -45 : 0}
                      textAnchor={timeRange === '1W' ? 'end' : 'middle'}
                      height={60}
                      tickFormatter={formatXAxisTick}
                      minTickGap={20}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tick={{ fill: '#fff' }}
                      stroke="#666"
                      tickFormatter={formatPrice}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#333', 
                        border: '1px solid #666',
                        padding: '10px'
                      }}
                      labelStyle={{ color: '#fff', marginBottom: '5px' }}
                      formatter={(value) => formatPrice(value)}
                      labelFormatter={formatTooltipLabel}
                      cursor={{ stroke: '#666' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#2196F3" 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      isAnimationActive={false}
                      name="Stock Price"
                      dot={timeRange !== '1D'}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center p-4">
                  <p>Chart data unavailable</p>
                </div>
              )}
            </div>

            <div className="stock-metrics">
              <div className="metric-grid">
                <div className="metric-card">
                  <span className="metric-label">Open</span>
                  <span className="metric-value">{formatPrice(stockData?.open)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">High</span>
                  <span className="metric-value">{formatPrice(stockData?.high)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Low</span>
                  <span className="metric-value">{formatPrice(stockData?.low)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Volume</span>
                  <span className="metric-value">{formatNumber(stockData?.volume)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Market Cap</span>
                  <span className="metric-value">${formatNumber(stockData?.marketCap)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">52W High</span>
                  <span className="metric-value">{formatPrice(stockData?.fiftyTwoWeekHigh)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">52W Low</span>
                  <span className="metric-value">{formatPrice(stockData?.fiftyTwoWeekLow)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">P/E Ratio</span>
                  <span className="metric-value">{stockData?.peRatio?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-warning">No data available</div>
      )}
    </div>
  );
};

export default StockDetails; 