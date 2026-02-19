const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoute');
const stockRoutes = require('./routes/stockRoute');
const recommendationRoutes = require('./routes/recommendationRoute');
const bondsRoutes = require('./routes/bonds');
const insuranceRoutes = require('./routes/insurance');
const autoTradingRoutes = require('./routes/autoTradingRoute');
const aiInsightsRoutes = require('./routes/aiInsightsRoute');
const http = require('http');
const { Server } = require('socket.io');
const yahooFinance = require('yahoo-finance2').default;


dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB: investPortal');
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Add logging utility
const logWebSocketEvent = (event, socket, details = {}) => {
    const timestamp = new Date().toISOString();
    const clientInfo = {
        id: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        transport: socket.conn.transport.name
    };

    console.log('WebSocket Event:', {
        timestamp,
        event,
        client: clientInfo,
        ...details
    });
};

app.get("/", (req, res) => {
    res.send("Backend is running ");
});

// Add health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        connections: io.engine.clientsCount
    });
});

// Function to get chart range parameters based on timeRange
const getChartParams = (timeRange) => {
    switch (timeRange) {
        case '1D':
            return { interval: '1m', range: '1d' };
        case '1W':
            return { interval: '30m', range: '7d' };
        case '1M':
            return { interval: '60m', range: '1mo' };
        case '3M':
            return { interval: '1d', range: '3mo' };
        case '1Y':
            return { interval: '1d', range: '1y' };
        case 'ALL':
            return { interval: '1wk', range: 'max' };
        default:
            return { interval: '1m', range: '1d' };
    }
};

// Function to format chart data based on time range
const formatChartData = (quotes, timeRange) => {
    if (!quotes || !quotes.length) return [];

    const data = quotes.map(quote => {
        const timestamp = new Date(quote.timestamp * 1000);
        let timeStr;

        switch (timeRange) {
            case '1D':
                timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                break;
            case '1W':
                timeStr = timestamp.toLocaleString([], {
                    weekday: 'short',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                break;
            default:
                timeStr = timestamp.toLocaleDateString();
        }

        // Filter out non-market hours for 1W view (before 9:30 AM and after 4:00 PM)
        if (timeRange === '1W') {
            const hours = timestamp.getHours();
            const minutes = timestamp.getMinutes();
            const timeInMinutes = hours * 60 + minutes;
            
            // Only include data points during market hours (9:30 AM - 4:00 PM)
            if (timeInMinutes < 570 || timeInMinutes > 960) { // 9:30 = 9*60+30 = 570, 16:00 = 16*60 = 960
                return null;
            }
        }

        return {
            timestamp: timestamp.getTime(),
            time: timeStr,
            price: quote.close || quote.open || quote.regularMarketPrice,
            volume: quote.volume || 0
        };
    }).filter(data => data && data.price && !isNaN(data.price));

    // Sort by timestamp to ensure correct order
    data.sort((a, b) => a.timestamp - b.timestamp);

    // For weekly view, ensure we have distinct data points
    if (timeRange === '1W') {
        const distinctData = [];
        let lastTimestamp = 0;
        
        for (const point of data) {
            // Only add points that are at least 30 minutes apart
            if (point.timestamp - lastTimestamp >= 30 * 60 * 1000) {
                distinctData.push(point);
                lastTimestamp = point.timestamp;
            }
        }
        
        return distinctData;
    }

    return data;
};

// WebSocket connection handling
io.on('connection', (socket) => {
    logWebSocketEvent('connection', socket);
    
    let stockUpdateInterval;
    let currentSymbol = null;
    let currentTimeRange = '1D';

    socket.on('subscribe', async (data) => {
        const { symbol, timeRange = '1D' } = typeof data === 'string' ? { symbol: data } : data;
        currentSymbol = symbol;
        currentTimeRange = timeRange;
        
        logWebSocketEvent('subscribe', socket, { symbol, timeRange });
        
        // Clear any existing interval
        if (stockUpdateInterval) {
            clearInterval(stockUpdateInterval);
        }

        // Function to fetch and emit stock data
        const fetchAndEmitStockData = async () => {
            try {
                // Validate symbol
                if (!symbol || typeof symbol !== 'string') {
                    throw new Error('Invalid symbol');
                }

                // Fetch basic quote data
                const quote = await yahooFinance.quote(symbol);
                if (!quote) {
                    throw new Error('No quote data available');
                }

                // Fetch chart data with error handling
                let chartData = [];
                try {
                    const { interval, range } = getChartParams(currentTimeRange);
                    const chartResult = await yahooFinance.chart(symbol, { interval, range });

                    if (chartResult && chartResult.quotes) {
                        chartData = formatChartData(chartResult.quotes, currentTimeRange);
                    }
                } catch (chartError) {
                    logWebSocketEvent('chartError', socket, {
                        symbol,
                        timeRange: currentTimeRange,
                        error: chartError.message,
                        stack: chartError.stack
                    });
                }

                // Construct stock data with fallbacks
                const stockData = {
                    symbol: symbol,
                    name: quote.shortName || quote.longName || symbol,
                    currentPrice: quote.regularMarketPrice || quote.currentPrice || 0,
                    change: quote.regularMarketChange || 0,
                    changePercent: quote.regularMarketChangePercent || 0,
                    open: quote.regularMarketOpen || quote.open || 0,
                    high: quote.regularMarketDayHigh || quote.dayHigh || 0,
                    low: quote.regularMarketDayLow || quote.dayLow || 0,
                    volume: quote.regularMarketVolume || quote.volume || 0,
                    marketCap: quote.marketCap || 0,
                    peRatio: quote.forwardPE || quote.trailingPE || null,
                    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
                    fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
                    chartData: chartData,
                    postMarketPrice: quote.postMarketPrice || null,
                    timeRange: currentTimeRange
                };

                // Validate the constructed data
                if (!stockData.currentPrice) {
                    throw new Error('Invalid price data');
                }

                logWebSocketEvent('emitUpdate', socket, {
                    symbol,
                    timeRange: currentTimeRange,
                    dataPoints: chartData.length,
                    hasPostMarket: !!stockData.postMarketPrice
                });

                socket.emit('stockUpdate', stockData);
            } catch (error) {
                logWebSocketEvent('fetchError', socket, {
                    symbol,
                    timeRange: currentTimeRange,
                    error: error.message,
                    stack: error.stack
                });
                
                socket.emit('stockError', { 
                    message: 'Failed to fetch real-time data',
                    details: error.message,
                    retrying: true
                });

                // Try to recover by retrying after a delay
                setTimeout(fetchAndEmitStockData, 5000);
            }
        };

        // Initial fetch with retry
        const attemptInitialFetch = async (retries = 3) => {
            try {
                await fetchAndEmitStockData();
                
                // Set up interval for real-time updates (only for 1D view)
                if (currentTimeRange === '1D') {
                    stockUpdateInterval = setInterval(fetchAndEmitStockData, 10000);
                    
                    logWebSocketEvent('intervalSetup', socket, {
                        symbol,
                        timeRange: currentTimeRange,
                        interval: 10000
                    });
                }
            } catch (error) {
                logWebSocketEvent('initialFetchError', socket, {
                    symbol,
                    timeRange: currentTimeRange,
                    retriesLeft: retries - 1,
                    error: error.message
                });

                if (retries > 1) {
                    setTimeout(() => attemptInitialFetch(retries - 1), 2000);
                }
            }
        };

        // Start with initial fetch
        attemptInitialFetch();
    });

    socket.on('changeTimeRange', (timeRange) => {
        logWebSocketEvent('changeTimeRange', socket, { 
            symbol: currentSymbol,
            oldTimeRange: currentTimeRange,
            newTimeRange: timeRange
        });
        
        currentTimeRange = timeRange;
        
        // Clear existing interval as we'll set up a new one if needed
        if (stockUpdateInterval) {
            clearInterval(stockUpdateInterval);
            stockUpdateInterval = null;
        }
        
        // Re-subscribe with new time range
        socket.emit('subscribe', { symbol: currentSymbol, timeRange });
    });

    socket.on('unsubscribe', () => {
        logWebSocketEvent('unsubscribe', socket, { symbol: currentSymbol });
        
        if (stockUpdateInterval) {
            clearInterval(stockUpdateInterval);
        }
    });

    socket.on('disconnect', (reason) => {
        logWebSocketEvent('disconnect', socket, { 
            reason,
            symbol: currentSymbol
        });
        
        if (stockUpdateInterval) {
            clearInterval(stockUpdateInterval);
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        logWebSocketEvent('error', socket, {
            error: error.message,
            stack: error.stack,
            symbol: currentSymbol
        });
    });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/bonds', bondsRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/auto-trading', autoTradingRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });
    
    res.status(500).json({ 
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    });

// Handle uncaught exceptions & rejections
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", {
        message: err.message,
        stack: err.stack
    });
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", {
        reason: reason instanceof Error ? reason.stack : reason,
        promise
    });
    process.exit(1);
});
