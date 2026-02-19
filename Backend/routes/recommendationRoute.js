const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const Portfolio = require('../models/Portfolio');
const User = require('../models/userModel');
const { getStockQuote, updateStockPrices, getHistoricalCandles, getCompanyProfile, getBasicMetrics } = require('../utils/yahooFinance');


/**
 * @route   GET /api/recommendations/trending
 * @desc    Get trending stocks (highest recent price increase)
 */
router.get('/trending', async (req, res) => {
    try {
        // Get all stocks from database
        const stocks = await Stock.find({});
        if (!stocks || stocks.length === 0) {
            return res.status(404).json({ message: "No stocks found in database" });
        }

        // Update stock prices with real-time data
        const updatedStocks = await updateStockPrices(stocks);
        
        // Sort by change percent in descending order (highest first)
        const trendingStocks = updatedStocks
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 10); // Get top 10 trending stocks
        
        res.status(200).json({
            strategy: "Trending Stocks",
            description: "Stocks with the highest recent price increase",
            recommendations: trendingStocks.map(stock => ({
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                change: stock.change,
                changePercent: stock.changePercent,
                reason: `Trending with ${stock.changePercent.toFixed(2)}% increase`
            }))
        });
    } catch (error) {
        console.error('Error fetching trending stocks:', error);
        res.status(500).json({ 
            message: "Failed to fetch trending stocks", 
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/recommendations/undervalued
 * @desc    Get undervalued stocks (below their average price or with high growth potential)
 */
router.get('/undervalued', async (req, res) => {
    try {
        // Get all stocks from database
        const stocks = await Stock.find({});
        if (!stocks || stocks.length === 0) {
            return res.status(404).json({ message: "No stocks found in database" });
        }

        // Update stock prices with real-time data
        const updatedStocks = await updateStockPrices(stocks);
        
        // For each stock, fetch additional data to determine if it's undervalued
        const stocksWithDetails = await Promise.all(
            updatedStocks.map(async (stock) => {
                try {
                    // Get financial metrics from Finnhub
                    const metrics = await getBasicMetrics(stock.symbol);
                    
                    const peRatio = metrics['peBasicExclExtraTTM'] || metrics['peTTM'] || 0;
                    const priceToBook = metrics['pbQuarterly'] || metrics['pbAnnual'] || 0;
                    const fiftyTwoWeekHigh = metrics['52WeekHigh'] || 0;
                    const currentPrice = stock.price;
                    
                    const percentBelow52WeekHigh = fiftyTwoWeekHigh > 0 
                        ? ((fiftyTwoWeekHigh - currentPrice) / fiftyTwoWeekHigh) * 100 
                        : 0;
                    
                    let undervaluedScore = 0;
                    if (peRatio > 0) undervaluedScore += peRatio < 15 ? 3 : (peRatio < 25 ? 1 : 0);
                    if (priceToBook > 0) undervaluedScore += priceToBook < 1 ? 3 : (priceToBook < 3 ? 1 : 0);
                    undervaluedScore += percentBelow52WeekHigh > 30 ? 3 : (percentBelow52WeekHigh > 15 ? 2 : (percentBelow52WeekHigh > 5 ? 1 : 0));
                    
                    return { ...stock, peRatio, priceToBook, percentBelow52WeekHigh, undervaluedScore };
                } catch (error) {
                    console.error(`Error fetching details for ${stock.symbol}:`, error);
                    return {
                        ...stock,
                        peRatio: 0,
                        priceToBook: 0,
                        percentBelow52WeekHigh: 0,
                        undervaluedScore: 0
                    };
                }
            })
        );
        
        // Sort by undervalued score in descending order (highest first)
        const undervaluedStocks = stocksWithDetails
            .sort((a, b) => b.undervaluedScore - a.undervaluedScore)
            .slice(0, 10); // Get top 10 undervalued stocks
        
        res.status(200).json({
            strategy: "Undervalued Stocks",
            description: "Stocks below their average price or with high growth potential",
            recommendations: undervaluedStocks.map(stock => {
                let reason = "Potentially undervalued based on ";
                const reasons = [];
                
                if (stock.peRatio > 0 && stock.peRatio < 15) {
                    reasons.push(`low P/E ratio (${stock.peRatio.toFixed(2)})`);
                }
                
                if (stock.priceToBook > 0 && stock.priceToBook < 1) {
                    reasons.push(`low price to book ratio (${stock.priceToBook.toFixed(2)})`);
                }
                
                if (stock.percentBelow52WeekHigh > 15) {
                    reasons.push(`${stock.percentBelow52WeekHigh.toFixed(2)}% below 52-week high`);
                }
                
                reason += reasons.length > 0 ? reasons.join(", ") : "multiple factors";
                
                return {
                    symbol: stock.symbol,
                    name: stock.name,
                    price: stock.price,
                    change: stock.change,
                    changePercent: stock.changePercent,
                    peRatio: stock.peRatio,
                    priceToBook: stock.priceToBook,
                    percentBelow52WeekHigh: stock.percentBelow52WeekHigh,
                    reason
                };
            })
        });
    } catch (error) {
        console.error('Error fetching undervalued stocks:', error);
        res.status(500).json({ 
            message: "Failed to fetch undervalued stocks", 
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/recommendations/high-volume
 * @desc    Get stocks with high trading volume
 */
router.get('/high-volume', async (req, res) => {
    try {
        // Get all stocks from database
        const stocks = await Stock.find({});
        if (!stocks || stocks.length === 0) {
            return res.status(404).json({ message: "No stocks found in database" });
        }

        // Update stock prices with real-time data
        const updatedStocks = await updateStockPrices(stocks);
        
        // Get historical volume data to compare current volume with average
        const stocksWithVolumeData = await Promise.all(
            updatedStocks.map(async (stock) => {
                try {
                    // Get last 7 days of daily candles for average volume
                    const toDate = new Date();
                    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    const candles = await getHistoricalCandles(stock.symbol, fromDate, toDate, 'D');
                    
                    const volumes = candles.map(c => c.volume).filter(v => v > 0);
                    const avgVolume = volumes.length > 0 ? volumes.reduce((s, v) => s + v, 0) / volumes.length : 0;
                    const volumeRatio = avgVolume > 0 ? stock.volume / avgVolume : 0;
                    
                    return { ...stock, avgVolume, volumeRatio };
                } catch (error) {
                    console.error(`Error fetching volume data for ${stock.symbol}:`, error);
                    return {
                        ...stock,
                        avgVolume: 0,
                        volumeRatio: 0
                    };
                }
            })
        );
        
        // Sort by volume ratio in descending order (highest first)
        const highVolumeStocks = stocksWithVolumeData
            .filter(stock => stock.volumeRatio > 1) // Only include stocks with above-average volume
            .sort((a, b) => b.volumeRatio - a.volumeRatio)
            .slice(0, 10); // Get top 10 high volume stocks
        
        res.status(200).json({
            strategy: "High Trading Volume",
            description: "Stocks with increasing trading volume, indicating strong market interest",
            recommendations: highVolumeStocks.map(stock => ({
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                change: stock.change,
                changePercent: stock.changePercent,
                volume: stock.volume,
                avgVolume: stock.avgVolume,
                volumeRatio: stock.volumeRatio,
                reason: `Trading volume ${stock.volumeRatio.toFixed(2)}x above average`
            }))
        });
    } catch (error) {
        console.error('Error fetching high volume stocks:', error);
        res.status(500).json({ 
            message: "Failed to fetch high volume stocks", 
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/recommendations/sector/:sector
 * @desc    Get stock recommendations based on sector
 */
router.get('/sector/:sector', async (req, res) => {
    try {
        const { sector } = req.params;
        
        if (!sector) {
            return res.status(400).json({ message: "Sector parameter is required" });
        }
        
        // Get all stocks from database
        const stocks = await Stock.find({});
        if (!stocks || stocks.length === 0) {
            return res.status(404).json({ message: "No stocks found in database" });
        }

        // Update stock prices with real-time data
        const updatedStocks = await updateStockPrices(stocks);
        
        // Get sector information for each stock
        const stocksWithSector = await Promise.all(
            updatedStocks.map(async (stock) => {
                try {
                    // Get sector/industry from Finnhub company profile
                    const profile = await getCompanyProfile(stock.symbol);
                    const stockSector = profile.finnhubIndustry || 'Unknown';
                    const industry = profile.finnhubIndustry || 'Unknown';
                    return { ...stock, sector: stockSector, industry };
                } catch (error) {
                    console.error(`Error fetching sector data for ${stock.symbol}:`, error);
                    return {
                        ...stock,
                        sector: 'Unknown',
                        industry: 'Unknown'
                    };
                }
            })
        );
        
        // Filter stocks by the requested sector (case-insensitive)
        const sectorStocks = stocksWithSector.filter(stock => 
            stock.sector.toLowerCase() === sector.toLowerCase() ||
            stock.industry.toLowerCase() === sector.toLowerCase()
        );
        
        if (sectorStocks.length === 0) {
            return res.status(404).json({ 
                message: `No stocks found in the ${sector} sector`,
                availableSectors: [...new Set(stocksWithSector.map(s => s.sector).filter(s => s !== 'Unknown'))]
            });
        }
        
        // Sort by performance (change percent) in descending order
        const recommendedSectorStocks = sectorStocks
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 10); // Get top 10 performing stocks in the sector
        
        res.status(200).json({
            strategy: "Sector-Based Recommendations",
            description: `Top performing stocks in the ${sector} sector`,
            recommendations: recommendedSectorStocks.map(stock => ({
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                change: stock.change,
                changePercent: stock.changePercent,
                sector: stock.sector,
                industry: stock.industry,
                reason: `Top performer in the ${stock.sector} sector (${stock.industry} industry)`
            }))
        });
    } catch (error) {
        console.error('Error fetching sector-based recommendations:', error);
        res.status(500).json({ 
            message: "Failed to fetch sector-based recommendations", 
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/recommendations/portfolio/:email
 * @desc    Get stock recommendations based on user's portfolio
 */
router.get('/portfolio/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({ message: "Email parameter is required" });
        }
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Find portfolio
        const portfolio = await Portfolio.findOne({ userId: user._id })
            .populate({
                path: 'stocks.stockId',
                model: 'Stock',
                select: 'symbol name'
            });
        
        if (!portfolio || !portfolio.stocks || portfolio.stocks.length === 0) {
            return res.status(404).json({ 
                message: "No stocks found in user's portfolio",
                suggestion: "Try other recommendation strategies like trending or sector-based"
            });
        }
        
        // Get symbols from user's portfolio
        const portfolioSymbols = portfolio.stocks
            .filter(s => s.stockId && s.stockId.symbol)
            .map(s => s.stockId.symbol);
        
        if (portfolioSymbols.length === 0) {
            return res.status(404).json({ message: "No valid stocks found in user's portfolio" });
        }
        
        // Get all stocks from database
        const allStocks = await Stock.find({});
        if (!allStocks || allStocks.length === 0) {
            return res.status(404).json({ message: "No stocks found in database" });
        }
        
        // Update stock prices with real-time data
        const updatedStocks = await updateStockPrices(allStocks);
        
        // Get sector and industry information for portfolio stocks
        const portfolioStocksData = await Promise.all(
            portfolioSymbols.map(async (symbol) => {
                try {
                    const profile = await getCompanyProfile(symbol);
                    return { symbol, sector: profile.finnhubIndustry || 'Unknown', industry: profile.finnhubIndustry || 'Unknown' };
                } catch (error) {
                    console.error(`Error fetching data for ${symbol}:`, error);
                    return { symbol, sector: 'Unknown', industry: 'Unknown' };
                }
            })
        );
        
        // Extract sectors and industries from portfolio
        const portfolioSectors = [...new Set(portfolioStocksData.map(s => s.sector).filter(s => s !== 'Unknown'))];
        const portfolioIndustries = [...new Set(portfolioStocksData.map(s => s.industry).filter(s => s !== 'Unknown'))];
        
        // Get sector and industry for all stocks
        const allStocksWithSectorData = await Promise.all(
            updatedStocks
                .filter(stock => !portfolioSymbols.includes(stock.symbol)) // Exclude stocks already in portfolio
                .map(async (stock) => {
                    try {
                    const profile = await getCompanyProfile(stock.symbol);
                    return { ...stock, sector: profile.finnhubIndustry || 'Unknown', industry: profile.finnhubIndustry || 'Unknown' };
                    } catch (error) {
                        console.error(`Error fetching sector data for ${stock.symbol}:`, error);
                        return {
                            ...stock,
                            sector: 'Unknown',
                            industry: 'Unknown'
                        };
                    }
                })
        );
        
        // Filter stocks that match portfolio sectors or industries
        const similarStocks = allStocksWithSectorData.filter(stock => 
            portfolioSectors.includes(stock.sector) || portfolioIndustries.includes(stock.industry)
        );
        
        if (similarStocks.length === 0) {
            return res.status(404).json({ 
                message: "No similar stocks found based on your portfolio",
                portfolioSectors,
                portfolioIndustries
            });
        }
        
        // Sort by performance (change percent) in descending order
        const recommendedSimilarStocks = similarStocks
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 10); // Get top 10 performing similar stocks
        
        res.status(200).json({
            strategy: "Portfolio-Based Recommendations",
            description: "Stocks similar to those in your portfolio",
            portfolioSectors,
            portfolioIndustries,
            recommendations: recommendedSimilarStocks.map(stock => {
                const matchingSector = portfolioSectors.includes(stock.sector);
                const matchingIndustry = portfolioIndustries.includes(stock.industry);
                
                let reason = "Similar to your portfolio: ";
                if (matchingSector && matchingIndustry) {
                    reason += `matches both sector (${stock.sector}) and industry (${stock.industry})`;
                } else if (matchingSector) {
                    reason += `matches sector (${stock.sector})`;
                } else if (matchingIndustry) {
                    reason += `matches industry (${stock.industry})`;
                }
                
                return {
                    symbol: stock.symbol,
                    name: stock.name,
                    price: stock.price,
                    change: stock.change,
                    changePercent: stock.changePercent,
                    sector: stock.sector,
                    industry: stock.industry,
                    reason
                };
            })
        });
    } catch (error) {
        console.error('Error fetching portfolio-based recommendations:', error);
        res.status(500).json({ 
            message: "Failed to fetch portfolio-based recommendations", 
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/recommendations/all
 * @desc    Get all recommendation strategies in one response
 */
router.get('/all', async (req, res) => {
    try {
        // Get all stocks from database
        const stocks = await Stock.find({});
        if (!stocks || stocks.length === 0) {
            return res.status(404).json({ message: "No stocks found in database" });
        }

        // Update stock prices with real-time data
        const updatedStocks = await updateStockPrices(stocks);
        
        // 1. Trending stocks (highest recent price increase)
        const trendingStocks = updatedStocks
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 5); // Get top 5 trending stocks
        
        // 2. High volume stocks
        // For simplicity, we'll just use the current volume data
        const highVolumeStocks = updatedStocks
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5); // Get top 5 high volume stocks
        
        // 3. Get a sample of sectors for sector-based recommendations
        const sampleSectors = ['Technology', 'Healthcare', 'Financial Services'];
        
        res.status(200).json({
            message: "Stock recommendations by strategy",
            recommendations: {
                trending: {
                    strategy: "Trending Stocks",
                    description: "Stocks with the highest recent price increase",
                    stocks: trendingStocks.map(stock => ({
                        symbol: stock.symbol,
                        name: stock.name,
                        price: stock.price,
                        change: stock.change,
                        changePercent: stock.changePercent
                    }))
                },
                highVolume: {
                    strategy: "High Trading Volume",
                    description: "Stocks with high trading volume, indicating strong market interest",
                    stocks: highVolumeStocks.map(stock => ({
                        symbol: stock.symbol,
                        name: stock.name,
                        price: stock.price,
                        volume: stock.volume
                    }))
                },
                sectors: {
                    strategy: "Sector-Based Recommendations",
                    description: "Explore stocks by sector",
                    availableSectors: sampleSectors,
                    endpoint: "/api/recommendations/sector/{sectorName}"
                },
                portfolio: {
                    strategy: "Portfolio-Based Recommendations",
                    description: "Get recommendations based on your portfolio",
                    endpoint: "/api/recommendations/portfolio/{email}"
                },
                undervalued: {
                    strategy: "Undervalued Stocks",
                    description: "Stocks that may be trading below their intrinsic value",
                    endpoint: "/api/recommendations/undervalued"
                }
            }
        });
    } catch (error) {
        console.error('Error fetching all recommendations:', error);
        res.status(500).json({ 
            message: "Failed to fetch recommendations", 
            error: error.message 
        });
    }
});

module.exports = router; 