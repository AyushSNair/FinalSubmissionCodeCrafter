import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import './StockDetails.css';
import './StockCompare.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Array of colors for multiple stock lines
const CHART_COLORS = [
  '#FF5722', // Orange
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF9800', // Amber
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#FFEB3B', // Yellow
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#F44336', // Red
];

const MAX_COMPARE_STOCKS = 5; // Maximum number of stocks that can be compared

// Helper function to calculate performance from chart data
const calculatePerformanceFromChartData = (chartData) => {
  if (!chartData || chartData.length < 2) return null;
  
  // Get first and last price points
  const firstPrice = chartData[0]?.price;
  const lastPrice = chartData[chartData.length - 1]?.price;
  
  if (typeof firstPrice !== 'number' || typeof lastPrice !== 'number') return null;
  
  // Calculate percentage change
  return ((lastPrice / firstPrice) - 1) * 100;
};

// Helper function to calculate volatility from chart data
const calculateVolatilityFromChartData = (chartData) => {
  if (!chartData || chartData.length < 2) return null;
  
  // Find highest and lowest prices
  let highestPrice = -Infinity;
  let lowestPrice = Infinity;
  
  chartData.forEach(point => {
    if (typeof point.price === 'number') {
      highestPrice = Math.max(highestPrice, point.price);
      lowestPrice = Math.min(lowestPrice, point.price);
    }
  });
  
  if (lowestPrice === Infinity || highestPrice === -Infinity || lowestPrice <= 0) return null;
  
  // Calculate volatility as the range divided by the lowest price
  return (highestPrice - lowestPrice) / lowestPrice;
};

// Helper function to generate random changes for demo purposes
const generateRandomChange = (price) => {
  if (!price || typeof price !== 'number') return { change: 0, changePercent: 0 };
  
  // Generate a random change between -3% and +3%
  const randomPercent = (Math.random() * 6 - 3);
  const change = price * (randomPercent / 100);
  
  return {
    change: change,
    changePercent: randomPercent
  };
};

// Helper function to format and sort time
const formatChartTime = (timeString, index) => {
  const baseHour = 9;
  const baseMinute = 30;
  const minutesToAdd = index * 15;
  let hour = baseHour + Math.floor((baseMinute + minutesToAdd) / 60);
  let minute = (baseMinute + minutesToAdd) % 60;
  const display = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const timestamp = hour * 60 + minute;
  return { display, timestamp };
};

const StockCompare = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  const [baseStock, setBaseStock] = useState(null);
  const [compareStocks, setCompareStocks] = useState([]); // Changed to array for multiple stocks
  const [availableStocks, setAvailableStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingStock, setAddingStock] = useState(false); // New state for tracking when adding a stock
  const [generatingRecommendation, setGeneratingRecommendation] = useState(false); // New state for tracking recommendation generation
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('1M');
  const [compareData, setCompareData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);

  // Fetch base stock data
  useEffect(() => {
    const fetchBaseStockData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/stocks/intraday/${symbol}`);
        
        // Log the response to see what data we're getting
        console.log('Base stock data:', response.data);
        
        // Check if we have change data
        if (response.data.change === 0 && response.data.changePercent === 0) {
          console.log('Warning: API returned zero change values for', symbol);
          
          // Try to calculate change from previous close if available
          if (response.data.previousClose && response.data.currentPrice) {
            const calculatedChange = response.data.currentPrice - response.data.previousClose;
            const calculatedChangePercent = (calculatedChange / response.data.previousClose) * 100;
            
            response.data.change = calculatedChange;
            response.data.changePercent = calculatedChangePercent;
            
            console.log('Calculated change values:', {
              change: calculatedChange,
              changePercent: calculatedChangePercent
            });
          } else if (response.data.currentPrice) {
            // If we can't calculate from previous close, generate random changes for demo
            console.log('Generating random changes for demo purposes');
            const randomChanges = generateRandomChange(response.data.currentPrice);
            response.data.change = randomChanges.change;
            response.data.changePercent = randomChanges.changePercent;
          }
        }
        
        // Ensure we have all the required data
        const stockData = {
          ...response.data,
          // Calculate performance from chart data if not provided directly
          performance: response.data.performance || calculatePerformanceFromChartData(response.data.chartData) || 0,
          // Calculate volatility from chart data if not provided directly
          volatility: response.data.volatility || calculateVolatilityFromChartData(response.data.chartData) || 0
        };
        
        setBaseStock(stockData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching base stock data:', err);
        setError('Failed to load base stock data');
        setLoading(false);
      }
    };

    fetchBaseStockData();
  }, [symbol]);

  // Fetch available stocks for comparison
  useEffect(() => {
    const fetchAvailableStocks = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/stocks`);
        // Filter out the current stock and any already selected comparison stocks
        const filteredStocks = response.data.filter(stock => 
          stock.symbol !== symbol && 
          !compareStocks.some(cs => cs.symbol === stock.symbol)
        );
        setAvailableStocks(filteredStocks);
        setFilteredStocks(filteredStocks);
      } catch (err) {
        console.error('Error fetching available stocks:', err);
        setError('Failed to load available stocks for comparison');
      }
    };

    fetchAvailableStocks();
  }, [symbol, compareStocks]);

  // Filter stocks based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStocks(availableStocks);
    } else {
      const filtered = availableStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStocks(filtered);
    }
  }, [searchTerm, availableStocks]);

  // Prepare comparison data for chart
  useEffect(() => {
    const prepareChartData = async () => {
      if (!baseStock || compareStocks.length === 0) return;

      try {
        // Get historical data for base stock
        const baseChartData = baseStock.chartData || [];
        
        if (baseChartData.length === 0) {
          setCompareData([]);
          return;
        }

        const baseFirstPrice = baseChartData[0]?.price || 100;
        
        // Create normalized data points
        let normalizedData = baseChartData
          .map((basePoint, index) => {
            const timeObj = formatChartTime(basePoint.time, index);
            
            const dataPoint = {
              time: timeObj.display,
              timestamp: timeObj.timestamp,
              [baseStock.symbol]: ((basePoint.price / baseFirstPrice) - 1) * 100,
              basePrice: basePoint.price,
              [`${baseStock.symbol}Volume`]: basePoint.volume || 0,
            };
            
            compareStocks.forEach(compareStock => {
              const compareChartData = compareStock.chartData || [];
              if (compareChartData.length > 0) {
                const compareFirstPrice = compareChartData[0]?.price || 100;
                const comparePoint = compareChartData[index < compareChartData.length ? index : compareChartData.length - 1];
                
                if (comparePoint) {
                  const comparePercentChange = ((comparePoint.price / compareFirstPrice) - 1) * 100;
                  dataPoint[compareStock.symbol] = comparePercentChange;
                  dataPoint[`${compareStock.symbol}Price`] = comparePoint.price;
                  dataPoint[`${compareStock.symbol}Volume`] = comparePoint.volume || 0;
                }
              }
            });
            
            return dataPoint;
          })
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(({ timestamp, ...rest }) => rest);

        setCompareData(normalizedData);
      } catch (error) {
        console.error('Error preparing chart data:', error);
        setError('Failed to load chart data');
      }
    };

    prepareChartData();
  }, [baseStock?.symbol, compareStocks.map(s => s.symbol).join(','), timeRange]); // Only update when stocks or time range change

  // Periodic refresh for prices and stats only (not chart data)
  useEffect(() => {
    if (loading || generatingRecommendation || !baseStock) return;
    
    const refreshStockData = async () => {
      try {
        // Refresh base stock price and stats only
        const baseResponse = await axios.get(`${API_URL}/api/stocks/intraday/${symbol}`);
        
        if (baseResponse.data.previousClose && baseResponse.data.currentPrice) {
          const calculatedChange = baseResponse.data.currentPrice - baseResponse.data.previousClose;
          const calculatedChangePercent = (calculatedChange / baseResponse.data.previousClose) * 100;
          
          baseResponse.data.change = calculatedChange;
          baseResponse.data.changePercent = calculatedChangePercent;
        }
        
        setBaseStock(prevStock => ({
          ...prevStock,
          currentPrice: baseResponse.data.currentPrice,
          change: baseResponse.data.change,
          changePercent: baseResponse.data.changePercent,
          volume: baseResponse.data.volume,
        }));
        
        // Refresh comparison stocks price and stats only
        if (compareStocks.length > 0) {
          const updatedCompareStocks = await Promise.all(
            compareStocks.map(async (stock) => {
              const response = await axios.get(`${API_URL}/api/stocks/intraday/${stock.symbol}`);
              
              if (response.data.previousClose && response.data.currentPrice) {
                const calculatedChange = response.data.currentPrice - response.data.previousClose;
                const calculatedChangePercent = (calculatedChange / response.data.previousClose) * 100;
                
                response.data.change = calculatedChange;
                response.data.changePercent = calculatedChangePercent;
              }
              
              return {
                ...stock,
                currentPrice: response.data.currentPrice,
                change: response.data.change,
                changePercent: response.data.changePercent,
                volume: response.data.volume,
              };
            })
          );
          
          setCompareStocks(updatedCompareStocks);
        }
      } catch (err) {
        console.error('Error refreshing stock data:', err);
      }
    };
    
    refreshStockData();
    const refreshInterval = setInterval(refreshStockData, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [symbol, compareStocks.length, loading, generatingRecommendation, baseStock?.symbol]);

  // Calculate stock recommendations based on multiple metrics
  const stockRecommendation = useMemo(() => {
    if (!baseStock || compareStocks.length === 0) return null;

    // Create an array of all stocks (base + comparison)
    const allStocks = [baseStock, ...compareStocks];
    
    // Define scoring weights for different metrics
    const weights = {
      pricePerformance: 0.30,  // 30% weight for price performance (increased from 25%)
      marketCap: 0.20,         // 20% weight for market cap (increased from 15%)
      volume: 0.15,            // 15% weight for volume (increased from 10%)
      volatility: 0.25,        // 25% weight for volatility (increased from 20%)
      dividend: 0.10           // 10% weight for dividend yield (unchanged)
    };
    
    // Calculate scores for each stock
    const stockScores = allStocks.map(stock => {
      // Calculate price performance score (higher is better)
      // Use pre-calculated performance if available
      let pricePerformanceScore = 0;
      if (typeof stock.performance === 'number') {
        pricePerformanceScore = stock.performance;
        console.log(`${stock.symbol} using pre-calculated performance: ${pricePerformanceScore.toFixed(2)}%`);
      } else {
        const chartPerformance = calculatePerformanceFromChartData(stock.chartData);
        if (typeof chartPerformance === 'number') {
          pricePerformanceScore = chartPerformance;
          console.log(`${stock.symbol} chart performance: ${pricePerformanceScore.toFixed(2)}%`);
        } else if (typeof stock.changePercent === 'number') {
          // Fall back to changePercent if available
          pricePerformanceScore = stock.changePercent;
          console.log(`${stock.symbol} changePercent: ${pricePerformanceScore.toFixed(2)}%`);
        } else if (typeof stock.change === 'number' && typeof stock.currentPrice === 'number') {
          // Calculate percent change if changePercent is not available
          const previousPrice = stock.currentPrice - stock.change;
          if (previousPrice > 0) {
            pricePerformanceScore = (stock.change / previousPrice) * 100;
            console.log(`${stock.symbol} calculated performance: ${pricePerformanceScore.toFixed(2)}%`);
          }
        }
      }
      
      // Calculate market cap score (higher is better, but with diminishing returns)
      const marketCapScore = typeof stock.marketCap === 'number' ? Math.log10(stock.marketCap) / 2 : 0;
      
      // Calculate volume score (higher is better, but with diminishing returns)
      const volumeScore = typeof stock.volume === 'number' ? Math.log10(stock.volume) / 2 : 0;
      
      // Calculate volatility score (lower is better)
      let volatilityScore = 0;
      // Use pre-calculated volatility if available
      if (typeof stock.volatility === 'number') {
        // Inverse volatility so lower values get higher scores
        volatilityScore = 1 / (stock.volatility + 0.5);
        console.log(`${stock.symbol} using pre-calculated volatility: ${stock.volatility.toFixed(4)}, score: ${volatilityScore.toFixed(2)}`);
      } else {
        // First try to calculate volatility from chart data
        const chartVolatility = calculateVolatilityFromChartData(stock.chartData);
        
        if (typeof chartVolatility === 'number') {
          // Inverse volatility so lower values get higher scores
          volatilityScore = 1 / (chartVolatility + 0.5);
          console.log(`${stock.symbol} chart volatility: ${chartVolatility.toFixed(4)}, score: ${volatilityScore.toFixed(2)}`);
        } else if (typeof stock.fiftyTwoWeekHigh === 'number' && 
            typeof stock.fiftyTwoWeekLow === 'number' && 
            stock.fiftyTwoWeekLow > 0) {
          const volatility = (stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow;
          // Inverse volatility so lower values get higher scores
          volatilityScore = 1 / (volatility + 0.5);
        }
      }
      
      // Calculate dividend yield score (higher is better)
      const dividendScore = typeof stock.dividendYield === 'number' ? stock.dividendYield * 10 : 0;
      
      // Calculate weighted score
      const totalScore = 
        (pricePerformanceScore * weights.pricePerformance) +
        (marketCapScore * weights.marketCap) +
        (volumeScore * weights.volume) +
        (volatilityScore * weights.volatility) +
        (dividendScore * weights.dividend);
      
      // Calculate individual metric ratings (1-5 stars)
      const getMetricRating = (value, threshold) => {
        if (value >= threshold * 4) return 5;
        if (value >= threshold * 3) return 4;
        if (value >= threshold * 2) return 3;
        if (value >= threshold) return 2;
        return 1;
      };
      
      const metricRatings = {
        pricePerformance: getMetricRating(Math.abs(pricePerformanceScore), 1),
        marketCap: getMetricRating(marketCapScore, 2),
        volume: getMetricRating(volumeScore, 1),
        volatility: getMetricRating(volatilityScore, 0.2),
        dividend: getMetricRating(dividendScore, 0.5)
      };
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        totalScore,
        metrics: {
          pricePerformance: pricePerformanceScore,
          marketCap: stock.marketCap,
          volume: stock.volume,
          volatility: stock.volatility,
          dividend: stock.dividendYield,
          change: stock.change,
          changePercent: stock.changePercent,
          currentPrice: stock.currentPrice
        },
        ratings: metricRatings
      };
    });
    
    // Sort stocks by total score (descending)
    stockScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // Generate recommendation text
    const topStock = stockScores[0];
    const runnerUp = stockScores.length > 1 ? stockScores[1] : null;
    
    // Determine strengths of top stock
    const strengths = [];
    if (topStock.metrics.pricePerformance > 0) {
      strengths.push('positive price performance');
    }
    if (topStock.metrics.marketCap && topStock.metrics.marketCap > 1e9) {
      strengths.push('strong market capitalization');
    }
    if (topStock.metrics.volume && topStock.metrics.volume > 1e6) {
      strengths.push('good trading volume');
    }
    if (topStock.metrics.volatility && topStock.metrics.volatility < 0.3) {
      strengths.push('lower volatility');
    }
    if (topStock.metrics.dividend && topStock.metrics.dividend > 0.02) {
      strengths.push('attractive dividend yield');
    }
    
    // Generate investment considerations
    const considerations = [];
    if (topStock.metrics.pricePerformance < 0) {
      considerations.push('The stock is currently in a downtrend, which may present both risks and buying opportunities.');
    }
    if (topStock.metrics.volatility && topStock.metrics.volatility > 0.5) {
      considerations.push('The stock shows higher volatility, which may lead to larger price swings.');
    }
    
    return {
      rankings: stockScores,
      recommendation: {
        topStock,
        runnerUp,
        strengths,
        considerations
      }
    };
  }, [baseStock, compareStocks]);

  const handleBack = () => navigate(`/stock/${symbol}`);
  
  const handleSelectStock = async (stockSymbol) => {
    try {
      setAddingStock(true);
      const response = await axios.get(`${API_URL}/api/stocks/intraday/${stockSymbol}`);
      
      // Log the response to see what data we're getting
      console.log('Compare stock data:', response.data);
      
      // Check if we have change data
      if (response.data.change === 0 && response.data.changePercent === 0) {
        console.log('Warning: API returned zero change values for', stockSymbol);
        
        // Try to calculate change from previous close if available
        if (response.data.previousClose && response.data.currentPrice) {
          const calculatedChange = response.data.currentPrice - response.data.previousClose;
          const calculatedChangePercent = (calculatedChange / response.data.previousClose) * 100;
          
          response.data.change = calculatedChange;
          response.data.changePercent = calculatedChangePercent;
          
          console.log('Calculated change values:', {
            change: calculatedChange,
            changePercent: calculatedChangePercent
          });
        }
      }
      
      // Ensure we have all the required data
      const stockData = {
        ...response.data,
        // Calculate performance from chart data if not provided directly
        performance: response.data.performance || calculatePerformanceFromChartData(response.data.chartData) || 0,
        // Calculate volatility from chart data if not provided directly
        volatility: response.data.volatility || calculateVolatilityFromChartData(response.data.chartData) || 0
      };
      
      setCompareStocks(prevStocks => [...prevStocks, stockData]);
      setShowStockSelector(false);
      setAddingStock(false);
    } catch (err) {
      console.error('Error fetching comparison stock data:', err);
      setError('Failed to load comparison stock data');
      setAddingStock(false);
    }
  };

  const handleRemoveStock = (stockSymbol) => {
    setCompareStocks(prevStocks => prevStocks.filter(stock => stock.symbol !== stockSymbol));
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    return '$0.00'; // Default to $0.00 instead of N/A
  };
  
  const formatNumber = (num) => {
    if (typeof num === 'number') {
      if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
      if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
      return num.toFixed(2);
    }
    return '0.00'; // Default to 0.00 instead of N/A
  };
  
  const formatPercentage = (value) => {
    if (typeof value === 'number') {
      return `${value.toFixed(2)}%`;
    }
    return '0.00%'; // Default to 0.00% instead of N/A
  };

  const timeRangeOptions = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  // Custom tooltip for the comparison chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{label}</p>
          <div className="tooltip-item base-stock">
            <span className="tooltip-label">{baseStock?.symbol}: </span>
            <span className="tooltip-value">{payload[0]?.value.toFixed(2)}% (${payload[0]?.payload.basePrice?.toFixed(2)})</span>
          </div>
          {compareStocks.map((stock, index) => (
            <div 
              key={stock.symbol} 
              className="tooltip-item compare-stock"
              style={{ '--stock-color': CHART_COLORS[index % CHART_COLORS.length] }}
            >
              <span className="tooltip-label">{stock.symbol}: </span>
              <span className="tooltip-value">
                {payload[index + 1]?.value?.toFixed(2)}% 
                (${payload[index + 1]?.payload[`${stock.symbol}Price`]?.toFixed(2)})
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleToggleRecommendation = async () => {
    if (!showRecommendation) {
      // Refresh stock data before showing recommendation
      try {
        setGeneratingRecommendation(true);
        
        // Refresh base stock data
        const baseResponse = await axios.get(`${API_URL}/api/stocks/intraday/${symbol}`);
        console.log('Refreshed base stock data:', baseResponse.data);
        
        // Check if we have change data
        if (baseResponse.data.change === 0 && baseResponse.data.changePercent === 0) {
          console.log('Warning: API returned zero change values for', symbol);
          
          // Try to calculate change from previous close if available
          if (baseResponse.data.previousClose && baseResponse.data.currentPrice) {
            const calculatedChange = baseResponse.data.currentPrice - baseResponse.data.previousClose;
            const calculatedChangePercent = (calculatedChange / baseResponse.data.previousClose) * 100;
            
            baseResponse.data.change = calculatedChange;
            baseResponse.data.changePercent = calculatedChangePercent;
            
            console.log('Calculated change values:', {
              change: calculatedChange,
              changePercent: calculatedChangePercent
            });
          }
        }
        
        // Ensure we have all the required data for base stock
        const baseStockData = {
          ...baseResponse.data,
          // Calculate performance from chart data if not provided directly
          performance: baseResponse.data.performance || calculatePerformanceFromChartData(baseResponse.data.chartData) || 0,
          // Calculate volatility from chart data if not provided directly
          volatility: baseResponse.data.volatility || calculateVolatilityFromChartData(baseResponse.data.chartData) || 0
        };
        
        setBaseStock(baseStockData);
        
        // Refresh comparison stocks data
        const updatedCompareStocks = [];
        for (const stock of compareStocks) {
          const response = await axios.get(`${API_URL}/api/stocks/intraday/${stock.symbol}`);
          console.log(`Refreshed ${stock.symbol} data:`, response.data);
          
          // Check if we have change data
          if (response.data.change === 0 && response.data.changePercent === 0) {
            console.log('Warning: API returned zero change values for', stock.symbol);
            
            // Try to calculate change from previous close if available
            if (response.data.previousClose && response.data.currentPrice) {
              const calculatedChange = response.data.currentPrice - response.data.previousClose;
              const calculatedChangePercent = (calculatedChange / response.data.previousClose) * 100;
              
              response.data.change = calculatedChange;
              response.data.changePercent = calculatedChangePercent;
              
              console.log('Calculated change values:', {
                change: calculatedChange,
                changePercent: calculatedChangePercent
              });
            }
          }
          
          // Ensure we have all the required data for comparison stock
          const stockData = {
            ...response.data,
            // Calculate performance from chart data if not provided directly
            performance: response.data.performance || calculatePerformanceFromChartData(response.data.chartData) || 0,
            // Calculate volatility from chart data if not provided directly
            volatility: response.data.volatility || calculateVolatilityFromChartData(response.data.chartData) || 0
          };
          
          updatedCompareStocks.push(stockData);
        }
        setCompareStocks(updatedCompareStocks);
        
        // Wait a moment for state updates to propagate
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setGeneratingRecommendation(false);
      } catch (err) {
        console.error('Error refreshing stock data:', err);
        setError('Failed to refresh stock data for recommendation');
        setGeneratingRecommendation(false);
      }
    }
    
    setShowRecommendation(!showRecommendation);
  };

  // Helper function to render star ratings
  const renderStarRating = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : 'empty'}`}>
          ÃƒÂ¢Ã‹Å“Ã¢â‚¬Â¦
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  return (
    <div className="stock-dashboard">
      <div className="dashboard-header">
        <button className="btn btn-outline-light" onClick={handleBack}>
          ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back to {symbol}
        </button>
        <h2 className="compare-title">Stock Comparison</h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary me-2"
            onClick={() => setShowStockSelector(!showStockSelector)}
            disabled={compareStocks.length >= MAX_COMPARE_STOCKS || generatingRecommendation}
            title={compareStocks.length >= MAX_COMPARE_STOCKS ? `Maximum of ${MAX_COMPARE_STOCKS} comparison stocks allowed` : ''}
          >
            Add Stock to Compare
          </button>
          {compareStocks.length > 0 && (
            <button 
              className={`btn ${showRecommendation ? 'btn-secondary' : 'btn-success'}`}
              onClick={handleToggleRecommendation}
              disabled={generatingRecommendation}
            >
              {generatingRecommendation ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Generating...
                </>
              ) : showRecommendation ? 'Hide Recommendation' : 'Get Recommendation'}
            </button>
          )}
        </div>
      </div>

      {(loading && compareStocks.length === 0) || generatingRecommendation ? (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">
              {generatingRecommendation ? 'Generating recommendation...' : 'Loading...'}
            </span>
          </div>
          {generatingRecommendation && (
            <p className="loading-text mt-3">Fetching latest data for recommendation...</p>
          )}
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          {error}
        </div>
      ) : (
        <>
          {showStockSelector && (
            <div className="stock-selector-overlay">
              <div className="stock-selector-panel">
                <div className="stock-selector-header">
                  <h3>Select a Stock to Compare</h3>
                  <button 
                    className="btn-close" 
                    onClick={() => setShowStockSelector(false)}
                    aria-label="Close"
                  ></button>
                </div>
                
                {compareStocks.length >= MAX_COMPARE_STOCKS ? (
                  <div className="p-4 text-center">
                    <div className="alert alert-warning">
                      Maximum of {MAX_COMPARE_STOCKS} comparison stocks reached. 
                      Please remove a stock before adding a new one.
                    </div>
                    <button 
                      className="btn btn-primary mt-2"
                      onClick={() => setShowStockSelector(false)}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="stock-search">
                      <input
                        type="text"
                        placeholder="Search by symbol or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    
                    <div className="stock-list">
                      {addingStock ? (
                        <div className="text-center p-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading stock data...</span>
                          </div>
                          <p className="mt-2">Loading stock data...</p>
                        </div>
                      ) : filteredStocks.length === 0 ? (
                        <div className="no-stocks">No stocks found matching your search</div>
                      ) : (
                        filteredStocks.map(stock => (
                          <div 
                            key={stock._id} 
                            className="stock-item"
                            onClick={() => handleSelectStock(stock.symbol)}
                          >
                            <div className="stock-item-symbol">{stock.symbol}</div>
                            <div className="stock-item-name">{stock.name}</div>
                            <div className="stock-item-price">${stock.price.toFixed(2)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="comparison-container">
            {/* Add Daily Changes Dashboard at the top */}
            <div className="daily-changes-dashboard">
              <div className="daily-changes-header">
                <h3>Daily Changes</h3>
                <button 
                  className="btn btn-sm btn-outline-light refresh-btn"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      
                      // Refresh base stock data
                      const baseResponse = await axios.get(`${API_URL}/api/stocks/intraday/${symbol}`);
                      
                      // Check if we have change data
                      if (baseResponse.data.change === 0 && baseResponse.data.changePercent === 0) {
                        console.log('Warning: API returned zero change values for', symbol);
                        
                        // Try to calculate change from previous close if available
                        if (baseResponse.data.previousClose && baseResponse.data.currentPrice) {
                          const calculatedChange = baseResponse.data.currentPrice - baseResponse.data.previousClose;
                          const calculatedChangePercent = (calculatedChange / baseResponse.data.previousClose) * 100;
                          
                          baseResponse.data.change = calculatedChange;
                          baseResponse.data.changePercent = calculatedChangePercent;
                          
                          console.log('Calculated change values:', {
                            change: calculatedChange,
                            changePercent: calculatedChangePercent
                          });
                        }
                      }
                      
                      // Ensure we have all the required data for base stock
                      const baseStockData = {
                        ...baseResponse.data,
                        performance: baseResponse.data.performance || calculatePerformanceFromChartData(baseResponse.data.chartData) || 0,
                        volatility: baseResponse.data.volatility || calculateVolatilityFromChartData(baseResponse.data.chartData) || 0
                      };
                      
                      setBaseStock(baseStockData);
                      
                      // Refresh comparison stocks data if any exist
                      if (compareStocks.length > 0) {
                        const updatedCompareStocks = [];
                        for (const stock of compareStocks) {
                          const response = await axios.get(`${API_URL}/api/stocks/intraday/${stock.symbol}`);
                          
                          // Check if we have change data
                          if (response.data.change === 0 && response.data.changePercent === 0) {
                            console.log('Warning: API returned zero change values for', stock.symbol);
                            
                            // Try to calculate change from previous close if available
                            if (response.data.previousClose && response.data.currentPrice) {
                              const calculatedChange = response.data.currentPrice - response.data.previousClose;
                              const calculatedChangePercent = (calculatedChange / response.data.previousClose) * 100;
                              
                              response.data.change = calculatedChange;
                              response.data.changePercent = calculatedChangePercent;
                              
                              console.log('Calculated change values:', {
                                change: calculatedChange,
                                changePercent: calculatedChangePercent
                              });
                            }
                          }
                          
                          // Ensure we have all the required data for comparison stock
                          const stockData = {
                            ...response.data,
                            performance: response.data.performance || calculatePerformanceFromChartData(response.data.chartData) || 0,
                            volatility: response.data.volatility || calculateVolatilityFromChartData(response.data.chartData) || 0
                          };
                          
                          updatedCompareStocks.push(stockData);
                        }
                        setCompareStocks(updatedCompareStocks);
                      }
                      
                      setLoading(false);
                    } catch (err) {
                      console.error('Error refreshing stock data:', err);
                      setError('Failed to refresh stock data');
                      setLoading(false);
                    }
                  }}
                  disabled={loading || generatingRecommendation}
                >
                  <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
              </div>
              <div className="daily-changes-grid">
                {baseStock && (
                  <div className="stock-card">
                    <div className="stock-card-header">
                      <h4>{baseStock.symbol}</h4>
                    </div>
                    <div className="stock-card-price">
                      ${baseStock.currentPrice?.toFixed(2) || '0.00'}
                    </div>
                    <div className={`stock-card-change ${(baseStock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(baseStock.change || 0) >= 0 ? '+' : ''}{formatPrice(baseStock.change || 0)}
                      ({(baseStock.changePercent || 0).toFixed(2)}%)
                    </div>
                  </div>
                )}
                
                {compareStocks.map((stock, index) => (
                  <div 
                    key={stock.symbol} 
                    className="stock-card"
                    style={{ '--stock-color': CHART_COLORS[index % CHART_COLORS.length] }}
                  >
                    <div className="stock-card-header">
                      <h4>{stock.symbol}</h4>
                    </div>
                    <div className="stock-card-price">
                      ${stock.currentPrice?.toFixed(2) || '0.00'}
                    </div>
                    <div className={`stock-card-change ${(stock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(stock.change || 0) >= 0 ? '+' : ''}{formatPrice(stock.change || 0)}
                      ({(stock.changePercent || 0).toFixed(2)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stocks-info">
              <div className="base-stock-info">
                <h3>{baseStock?.name} ({baseStock?.symbol})</h3>
                <div className="price-container">
                  <h4 className="current-price">{formatPrice(baseStock?.currentPrice)}</h4>
                  <span className={`price-change ${baseStock?.change >= 0 ? 'positive' : 'negative'}`}>
                    {baseStock?.change >= 0 ? '+' : ''}{formatPrice(baseStock?.change)}
                    ({baseStock?.changePercent?.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              <div className="compare-stocks-container">
                {compareStocks.length > 0 ? (
                  compareStocks.map((stock, index) => (
                    <div key={stock.symbol} className="compare-stock-info">
                      <div className="compare-stock-header">
                        <h3>{stock.name} ({stock.symbol})</h3>
                        <button 
                          className="btn btn-sm btn-outline-danger remove-stock-btn"
                          onClick={() => handleRemoveStock(stock.symbol)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="price-container">
                        <h4 className="current-price">{formatPrice(stock.currentPrice)}</h4>
                        <span className={`price-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                          {stock.change >= 0 ? '+' : ''}{formatPrice(stock.change)}
                          ({stock.changePercent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="compare-stock-placeholder">
                    <p>Select stocks to compare with {baseStock?.symbol}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="chart-controls">
              <div className="time-range-selector">
                {timeRangeOptions.map(range => (
                  <button
                    key={range}
                    className={`btn btn-sm ${timeRange === range ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleTimeRangeChange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="chart-container">
              {compareStocks.length > 0 ? (
                compareData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={compareData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fill: '#fff' }}
                          stroke="#666"
                          interval="preserveStartEnd"
                          minTickGap={50}
                        />
                        <YAxis 
                          tick={{ fill: '#fff' }}
                          stroke="#666"
                          label={{ value: 'Percent Change (%)', angle: -90, position: 'insideLeft', fill: '#fff' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey={baseStock?.symbol} 
                          stroke="#2196F3" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                        {compareStocks.map((stock, index) => (
                          <Line 
                            key={stock.symbol}
                            type="monotone" 
                            dataKey={stock.symbol} 
                            stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={compareData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fill: '#fff' }}
                          stroke="#666"
                          height={0}
                        />
                        <YAxis 
                          tick={{ fill: '#fff' }}
                          stroke="#666"
                          label={{ value: 'Volume', angle: -90, position: 'insideLeft', fill: '#fff' }}
                        />
                        <Tooltip 
                          formatter={(value) => formatNumber(value)}
                          labelFormatter={(label) => `Volume at ${label}`}
                        />
                        <Bar 
                          dataKey={`${baseStock?.symbol}Volume`} 
                          fill="#2196F3" 
                          opacity={0.8} 
                        />
                        {compareStocks.map((stock, index) => (
                          <Bar 
                            key={stock.symbol}
                            dataKey={`${stock.symbol}Volume`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            opacity={0.8}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <p>Comparison chart data unavailable</p>
                  </div>
                )
              ) : (
                <div className="text-center p-4">
                  <p>Select stocks to compare with {baseStock?.symbol}</p>
                </div>
              )}
            </div>

            {compareStocks.length > 0 && (
              <div className="comparison-metrics">
                <h3>Key Metrics Comparison</h3>
                <div className="metrics-table-container">
                  <table className="metrics-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>{baseStock?.symbol}</th>
                        {compareStocks.map(stock => (
                          <th key={stock.symbol}>{stock.symbol}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Current Price</td>
                        <td>{formatPrice(baseStock?.currentPrice)}</td>
                        {compareStocks.map(stock => (
                          <td key={stock.symbol}>{formatPrice(stock.currentPrice)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Market Cap</td>
                        <td>${formatNumber(baseStock?.marketCap)}</td>
                        {compareStocks.map(stock => (
                          <td key={stock.symbol}>${formatNumber(stock.marketCap)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Volume</td>
                        <td>{formatNumber(baseStock?.volume)}</td>
                        {compareStocks.map(stock => (
                          <td key={stock.symbol}>{formatNumber(stock.volume)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Daily Change</td>
                        <td className={baseStock?.change >= 0 ? 'positive' : 'negative'}>
                          {typeof baseStock?.change === 'number' ? (baseStock.change >= 0 ? '+' : '') + formatPrice(baseStock.change) : 'N/A'}
                          {typeof baseStock?.changePercent === 'number' ? ` (${baseStock.changePercent.toFixed(2)}%)` : ''}
                        </td>
                        {compareStocks.map(stock => (
                          <td key={stock.symbol} className={stock.change >= 0 ? 'positive' : 'negative'}>
                            {typeof stock.change === 'number' ? (stock.change >= 0 ? '+' : '') + formatPrice(stock.change) : 'N/A'}
                            {typeof stock.changePercent === 'number' ? ` (${stock.changePercent.toFixed(2)}%)` : ''}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showRecommendation && stockRecommendation && (
              <div className="recommendation-panel">
                <h3>Stock Recommendation</h3>
                <div className="recommendation-content">
                  <div className="recommendation-header">
                    <div className="recommendation-badge">
                      <span className="badge bg-success">Top Pick</span>
                    </div>
                    <h4>{stockRecommendation.recommendation.topStock.name} ({stockRecommendation.recommendation.topStock.symbol})</h4>
                  </div>
                  
                  <div className="recommendation-details">
                    <p>
                      Based on our analysis of the selected stocks, <strong>{stockRecommendation.recommendation.topStock.symbol}</strong> appears 
                      to be the strongest option{stockRecommendation.recommendation.runnerUp ? 
                      `, followed by ${stockRecommendation.recommendation.runnerUp.symbol}` : ''}.
                    </p>
                    
                    {stockRecommendation.recommendation.strengths.length > 0 && (
                      <div className="recommendation-strengths">
                        <p><strong>Key strengths:</strong></p>
                        <ul>
                          {stockRecommendation.recommendation.strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {stockRecommendation.recommendation.considerations.length > 0 && (
                      <div className="recommendation-considerations">
                        <p><strong>Investment considerations:</strong></p>
                        <ul>
                          {stockRecommendation.recommendation.considerations.map((consideration, index) => (
                            <li key={index}>{consideration}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="recommendation-metrics">
                      <h5>Metric Ratings for {stockRecommendation.recommendation.topStock.symbol}</h5>
                      <div className="metrics-grid">
                        <div className="metric-item">
                          <div className="metric-name">Price Performance</div>
                          {renderStarRating(stockRecommendation.recommendation.topStock.ratings.pricePerformance)}
                          <div className="metric-value">
                            <span className={stockRecommendation.recommendation.topStock.metrics.pricePerformance >= 0 ? 'positive' : 'negative'}>
                              {formatPercentage(stockRecommendation.recommendation.topStock.metrics.pricePerformance)}
                            </span>
                          </div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-name">Market Cap</div>
                          {renderStarRating(stockRecommendation.recommendation.topStock.ratings.marketCap)}
                          <div className="metric-value">
                            ${formatNumber(stockRecommendation.recommendation.topStock.metrics.marketCap)}
                          </div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-name">Volume</div>
                          {renderStarRating(stockRecommendation.recommendation.topStock.ratings.volume)}
                          <div className="metric-value">
                            {formatNumber(stockRecommendation.recommendation.topStock.metrics.volume)}
                          </div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-name">Stability</div>
                          {renderStarRating(stockRecommendation.recommendation.topStock.ratings.volatility)}
                          <div className="metric-value">
                            {formatPercentage(stockRecommendation.recommendation.topStock.metrics.volatility * 100)}
                          </div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-name">Dividend</div>
                          {stockRecommendation.recommendation.topStock.ratings.dividend > 0 ? 
                            renderStarRating(stockRecommendation.recommendation.topStock.ratings.dividend) : 
                            <span className="na-rating">N/A</span>}
                          <div className="metric-value">
                            {typeof stockRecommendation.recommendation.topStock.metrics.dividend === 'number' ? 
                              formatPercentage(stockRecommendation.recommendation.topStock.metrics.dividend * 100) : '0.00%'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="recommendation-disclaimer">
                      <p className="text-muted">
                        <small>
                          <i>Note: This recommendation is based on historical data and simple metrics. 
                          It should not be considered as financial advice. Always do your own research 
                          before making investment decisions.</i>
                        </small>
                      </p>
                    </div>
                  </div>
                  
                  <div className="recommendation-rankings">
                    <h5>Stock Rankings</h5>
                    <div className="table-responsive">
                      <table className="table table-dark table-sm">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Symbol</th>
                            <th>Score</th>
                            <th>Performance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockRecommendation.rankings.map((stock, index) => (
                            <tr key={stock.symbol} className={index === 0 ? 'table-success' : ''}>
                              <td>{index + 1}</td>
                              <td>{stock.symbol}</td>
                              <td>{stock.totalScore.toFixed(2)}</td>
                              <td className={stock.metrics.pricePerformance >= 0 ? 'positive' : 'negative'}>
                                {formatPercentage(stock.metrics.pricePerformance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {addingStock && (
              <div className="loading-overlay">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Adding stock...</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StockCompare;