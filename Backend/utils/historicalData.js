const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const FINNHUB_KEY = process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetches historical data for a given ticker and saves it to a CSV file
 * @param {string} symbol - The stock symbol
 * @param {number} years - Number of years of historical data to fetch
 * @returns {Promise<string>} - Path to the created CSV file
 */
const fetchHistoricalData = async (symbol, years = 2) => {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - years);

        console.log(`Fetching historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const from = Math.floor(startDate.getTime() / 1000);
        const to = Math.floor(endDate.getTime() / 1000);

        const { data } = await axios.get(`${BASE_URL}/stock/candle`, {
            params: { symbol, resolution: 'D', from, to, token: FINNHUB_KEY }
        });

        if (!data || data.s !== 'ok' || !data.c || data.c.length === 0) {
            throw new Error(`No historical data available for ${symbol}`);
        }

        const csvHeader = 'Date,Open,High,Low,Close,Volume,AdjClose\n';
        const csvRows = data.t.map((timestamp, i) => {
            const date = new Date(timestamp * 1000).toISOString().split('T')[0];
            return `${date},${data.o[i]},${data.h[i]},${data.l[i]},${data.c[i]},${data.v[i]},${data.c[i]}`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        const fileName = `${symbol}_${years}years_${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = path.join(dataDir, fileName);
        fs.writeFileSync(filePath, csvContent);

        console.log(`Historical data saved to ${filePath}`);
        return filePath;
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error.message);
        throw error;
    }
};

module.exports = { fetchHistoricalData };