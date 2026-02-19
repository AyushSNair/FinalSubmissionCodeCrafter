const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
    constructor() {
        // Initialize Gemini API with your API key
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Get the model
        this.model = this.genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        });
    }

    async getStockInsights(symbol, stockData, userQuery) {
        try {
            // Prepare context for the AI
            const context = `
                As a financial expert, analyze this stock data:
                Symbol: ${symbol}
                Current Price: $${stockData.currentPrice}
                Previous Close: $${stockData.previousClose}
                Market Cap: $${stockData.marketCap}
                Volume: ${stockData.volume}
                52-Week High: $${stockData.fiftyTwoWeekHigh}
                52-Week Low: $${stockData.fiftyTwoWeekLow}
                P/E Ratio: ${stockData.peRatio}
                Dividend Yield: ${stockData.dividendYield}%
            `;

            // Generate response
            const result = await this.model.generateContent([
                context,
                userQuery || "Provide a comprehensive analysis of this stock's current position and future outlook."
            ]);

            // Get response
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('Error in getStockInsights:', error);
            throw new Error('Failed to generate stock insights');
        }
    }

    async getMarketAnalysis(userQuery) {
        try {
            const prompt = userQuery || `
                Please provide a comprehensive market analysis including:
                1. Overall market sentiment and trends
                2. Key sector movements
                3. Risk factors and opportunities
                4. Short-term and long-term outlook
                5. Trading recommendations
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('Error in getMarketAnalysis:', error);
            throw new Error('Failed to generate market analysis');
        }
    }

    async getPortfolioRecommendations(portfolio, userPreferences) {
        try {
            const portfolioContext = portfolio.map(stock => 
                `${stock.symbol}: ${stock.quantity} shares at $${stock.currentPrice}`
            ).join('\n');

            const prompt = `
                As a portfolio manager, analyze this portfolio and provide recommendations:
                
                Portfolio Holdings:
                ${portfolioContext}
                
                User Profile:
                Risk Tolerance: ${userPreferences.riskTolerance}
                Investment Horizon: ${userPreferences.investmentHorizon}
                Investment Goals: ${userPreferences.goals}
                
                Provide:
                1. Portfolio health assessment
                2. Diversification analysis
                3. Rebalancing recommendations
                4. Risk management suggestions
                5. Specific actions to optimize performance
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('Error in getPortfolioRecommendations:', error);
            throw new Error('Failed to generate portfolio recommendations');
        }
    }
}

module.exports = new GeminiService(); 