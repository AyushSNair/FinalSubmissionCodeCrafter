import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './StockPrediction.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const StockPrediction = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPrediction = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/stocks/prediction/${symbol}`);
                setPrediction(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching prediction:', err);
                setError('Failed to load prediction data');
                setLoading(false);
            }
        };

        fetchPrediction();
    }, [symbol]);

    const handleBack = () => {
        navigate('/stocks');
    };

    if (loading) {
        return (
            <div className="prediction-container">
                <div className="loading">Loading prediction data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="prediction-container">
                <div className="error">{error}</div>
                <button onClick={handleBack} className="back-button">Back to Stocks</button>
            </div>
        );
    }

    return (
        <div className="prediction-container">
            <h1>Stock Prediction for {symbol}</h1>
            
            <div className="prediction-card">
                <div className="price-section">
                    <h2>Price Analysis</h2>
                    <div className="price-info">
                        <div className="price-item">
                            <span className="label">Current Price:</span>
                            <span className="value">${prediction.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="price-item">
                            <span className="label">Predicted Price (5 Days):</span>
                            <span className={`value ${prediction.predictedPrice > prediction.currentPrice ? 'positive' : 'negative'}`}>
                                ${prediction.predictedPrice.toFixed(2)}
                            </span>
                        </div>
                        <div className="price-item">
                            <span className="label">Price Change (5 Days):</span>
                            <span className={`value ${prediction.predictedPrice > prediction.currentPrice ? 'positive' : 'negative'}`}>
                                {((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice * 100).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                    <div className="prediction-note">
                        Note: This prediction is based on technical analysis and historical data for the next 5 trading days.
                    </div>
                </div>

                <div className="trend-section">
                    <h2>Market Trend</h2>
                    <div className={`trend-indicator ${prediction.trend.toLowerCase()}`}>
                        {prediction.trend}
                    </div>
                    <div className="confidence">
                        Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </div>
                </div>

                <div className="technical-section">
                    <h2>Technical Indicators</h2>
                    <div className="indicators-grid">
                        <div className="indicator-item">
                            <span className="label">20-day MA:</span>
                            <span className="value">${prediction.technicalIndicators.ma20.toFixed(2)}</span>
                        </div>
                        <div className="indicator-item">
                            <span className="label">50-day MA:</span>
                            <span className="value">${prediction.technicalIndicators.ma50.toFixed(2)}</span>
                        </div>
                        <div className="indicator-item">
                            <span className="label">RSI (14):</span>
                            <span className={`value ${prediction.technicalIndicators.rsi > 70 ? 'overbought' : 
                                               prediction.technicalIndicators.rsi < 30 ? 'oversold' : 'neutral'}`}>
                                {prediction.technicalIndicators.rsi.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="analysis-section">
                    <h2>Analysis Summary</h2>
                    <div className="analysis-content">
                        {prediction.trend === 'Bullish' && (
                            <div className="bullish-analysis">
                                <h3>Bullish Signals:</h3>
                                <ul>
                                    {prediction.technicalIndicators.ma20 > prediction.technicalIndicators.ma50 && 
                                        <li>Golden Cross: 20-day MA is above 50-day MA</li>}
                                    {prediction.technicalIndicators.rsi < 30 && 
                                        <li>RSI indicates oversold conditions</li>}
                                </ul>
                            </div>
                        )}
                        {prediction.trend === 'Bearish' && (
                            <div className="bearish-analysis">
                                <h3>Bearish Signals:</h3>
                                <ul>
                                    {prediction.technicalIndicators.ma20 < prediction.technicalIndicators.ma50 && 
                                        <li>Death Cross: 20-day MA is below 50-day MA</li>}
                                    {prediction.technicalIndicators.rsi > 70 && 
                                        <li>RSI indicates overbought conditions</li>}
                                </ul>
                            </div>
                        )}
                        {prediction.trend === 'Neutral' && (
                            <div className="neutral-analysis">
                                <p>Mixed technical indicators suggest a neutral market position</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button onClick={handleBack} className="back-button">Back to Stocks</button>
        </div>
    );
};

export default StockPrediction; 