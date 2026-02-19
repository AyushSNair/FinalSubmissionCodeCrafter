const axios = require('axios');
require('dotenv').config();

const FINNHUB_KEY = process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetch a real-time stock quote from Finnhub.
 */
const getStockQuote = async (symbol) => {
    const { data } = await axios.get(`${BASE_URL}/quote`, {
        params: { symbol, token: FINNHUB_KEY }
    });

    if (!data || data.c === 0) {
        throw new Error(`No quote data available for ${symbol}`);
    }

    return {
        symbol,
        name: symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        open: data.o,
        high: data.h,
        low: data.l,
        previousClose: data.pc,
        volume: 0,
        marketCap: 0
    };
};

/**
 * Fetch candle (OHLCV) data from Finnhub.
 * @param {string} resolution - 'D' for daily, '60' for hourly, '15', '5', '1'
 */
const getHistoricalCandles = async (symbol, fromDate, toDate, resolution = 'D') => {
    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(toDate.getTime() / 1000);

    const { data } = await axios.get(`${BASE_URL}/stock/candle`, {
        params: { symbol, resolution, from, to, token: FINNHUB_KEY }
    });

    if (!data || data.s !== 'ok' || !data.c || data.c.length === 0) {
        throw new Error(`No candle data for ${symbol} (resolution=${resolution})`);
    }

    return data.t.map((timestamp, i) => ({
        date: new Date(timestamp * 1000),
        timestamp,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
    }));
};

/**
 * Fetch company profile from Finnhub (name, industry, market cap, etc.)
 */
const getCompanyProfile = async (symbol) => {
    const { data } = await axios.get(`${BASE_URL}/stock/profile2`, {
        params: { symbol, token: FINNHUB_KEY }
    });
    return data || {};
};

/**
 * Fetch basic financial metrics from Finnhub (P/E, 52-week high/low, etc.)
 */
const getBasicMetrics = async (symbol) => {
    const { data } = await axios.get(`${BASE_URL}/stock/metric`, {
        params: { symbol, metric: 'all', token: FINNHUB_KEY }
    });
    return data?.metric || {};
};

/**
 * Update multiple stocks with real-time prices.
 * Same interface as before — callers don't need to change.
 */
const updateStockPrices = async (stocks) => {
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
        throw new Error('No stocks provided for update');
    }

    const validStocks = stocks.filter(stock => stock && stock.symbol);
    if (validStocks.length === 0) throw new Error('No valid stocks found for update');

    const results = await Promise.allSettled(
        validStocks.map(stock => getStockQuote(stock.symbol))
    );

    const updatedStocks = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    if (updatedStocks.length === 0) {
        throw new Error('Failed to fetch any stock quotes');
    }

    return updatedStocks;
};

module.exports = { getStockQuote, updateStockPrices, getHistoricalCandles, getCompanyProfile, getBasicMetrics };