const { getHistoricalCandles } = require('../utils/yahooFinance');

class MeanReversionService {
    constructor() {
        this.lookbackPeriod = 20; // Number of days to calculate mean
        this.standardDeviations = 1; // Reduced from 2 to 1 standard deviation for more sensitive signals
        this.minConfidence = 0.2; // Minimum confidence threshold
        this.watchlist = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT']; // Default watchlist
    }

    calculateMean(prices) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    }

    calculateStandardDeviation(prices, mean) {
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
        return Math.sqrt(variance);
    }

    calculateZScore(currentPrice, mean, stdDev) {
        return (currentPrice - mean) / stdDev;
    }

    async calculateMeanReversionSignal(symbol) {
        try {
            console.log('Calculating signal for', symbol);
            
            // Calculate date range based on current date
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - this.lookbackPeriod - 5); // extra buffer for weekends

            const candles = await getHistoricalCandles(symbol, startDate, endDate);

            if (!candles || candles.length === 0) {
                console.log(`No data available for ${symbol}`);
                return null;
            }

            const prices = candles.map(c => c.close);
            const mean = this.calculateMean(prices);
            const stdDev = this.calculateStandardDeviation(prices, mean);
            const currentPrice = prices[prices.length - 1];
            const zScore = this.calculateZScore(currentPrice, mean, stdDev);

            let signal = 'HOLD';
            let confidence = Math.min(1, Math.abs(zScore) / this.standardDeviations);

            // Apply minimum confidence threshold
            if (confidence < this.minConfidence) {
                confidence = 0;
            } else {
                if (zScore > this.standardDeviations) {
                    signal = 'SELL';
                } else if (zScore < -this.standardDeviations) {
                    signal = 'BUY';
                }
            }

            return {
                symbol,
                signal,
                confidence,
                currentPrice,
                mean,
                zScore,
                stdDev
            };
        } catch (error) {
            console.error(`Error calculating signal for ${symbol}:`, error);
            return null;
        }
    }

    async analyzePortfolio(portfolio) {
        try {
            console.log('Analyzing portfolio:', portfolio);
            const signals = [];
            
            // Analyze portfolio stocks
            if (Array.isArray(portfolio) && portfolio.length > 0) {
                for (const stock of portfolio) {
                    try {
                        if (!stock || !stock.symbol) {
                            console.log('Invalid stock object:', stock);
                            continue;
                        }
                        const signal = await this.calculateMeanReversionSignal(stock.symbol);
                        if (signal) {
                            signals.push(signal);
                        }
                    } catch (error) {
                        console.error(`Error analyzing stock ${stock.symbol}:`, error);
                    }
                }
            }

            // Analyze watchlist stocks
            for (const symbol of this.watchlist) {
                // Skip if already in portfolio
                if (!portfolio.find(s => s.symbol === symbol)) {
                    try {
                        const signal = await this.calculateMeanReversionSignal(symbol);
                        if (signal && signal.signal === 'BUY') {
                            signals.push(signal);
                        }
                    } catch (error) {
                        console.error(`Error analyzing watchlist stock ${symbol}:`, error);
                    }
                }
            }

            // Sort signals by confidence
            return signals.sort((a, b) => b.confidence - a.confidence);
        } catch (error) {
            console.error('Error analyzing portfolio:', error);
            throw error;
        }
    }

    async analyzeWatchlist(symbols) {
        try {
            console.log('Analyzing watchlist:', symbols);
            const signals = [];
            
            for (const symbol of symbols) {
                try {
                    if (!symbol) {
                        console.log('Invalid symbol in watchlist');
                        continue;
                    }
                    const signal = await this.calculateMeanReversionSignal(symbol);
                    if (signal) {
                        signals.push(signal);
                    }
                } catch (error) {
                    console.error(`Error analyzing watchlist stock ${symbol}:`, error);
                }
            }

            // Sort signals by confidence
            return signals.sort((a, b) => b.confidence - a.confidence);
        } catch (error) {
            console.error('Error analyzing watchlist:', error);
            throw error;
        }
    }
}

module.exports = new MeanReversionService(); 