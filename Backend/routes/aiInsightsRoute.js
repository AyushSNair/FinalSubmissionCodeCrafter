const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const { getStockQuote } = require('../utils/yahooFinance');
const Portfolio = require('../models/Portfolio');
const User = require('../models/userModel');

// Get AI insights for a specific stock
router.post('/stock-insights/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { query } = req.body;

        // Get real-time stock data
        const stockData = await getStockQuote(symbol);
        if (!stockData) {
            return res.status(404).json({ message: 'Stock data not found' });
        }

        // Get AI insights
        const insights = await geminiService.getStockInsights(symbol, stockData, query);
        res.json({ insights });
    } catch (error) {
        console.error('Error getting stock insights:', error);
        res.status(500).json({ message: 'Failed to get stock insights' });
    }
});

// Get market analysis
router.post('/market-analysis', async (req, res) => {
    try {
        const { query } = req.body;
        const analysis = await geminiService.getMarketAnalysis(query);
        res.json({ analysis });
    } catch (error) {
        console.error('Error getting market analysis:', error.message);
        res.status(500).json({ 
            message: 'Failed to get market analysis',
            error: error.message
        });
    }
});

// Get portfolio recommendations
router.post('/portfolio-recommendations', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const portfolio = await Portfolio.findOne({ userId: user._id })
            .populate('stocks.stockId');

        if (!portfolio) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        // Get current prices for all stocks
        const portfolioData = await Promise.all(
            portfolio.stocks.map(async (stock) => {
                const quote = await getStockQuote(stock.stockId.symbol);
                return {
                    symbol: stock.stockId.symbol,
                    quantity: stock.quantity,
                    currentPrice: quote.price
                };
            })
        );

        // Get user preferences (you'll need to implement this)
        const userPreferences = {
            riskTolerance: 'moderate', // You should get this from user settings
            investmentHorizon: 'long-term',
            goals: 'growth'
        };

        const recommendations = await geminiService.getPortfolioRecommendations(
            portfolioData,
            userPreferences
        );

        res.json({ recommendations });
    } catch (error) {
        console.error('Error getting portfolio recommendations:', error);
        res.status(500).json({ message: 'Failed to get portfolio recommendations' });
    }
});

module.exports = router; 