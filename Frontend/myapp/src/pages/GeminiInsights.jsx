import React, { useState } from 'react';
import {
    Container,
    Typography,
    TextField,
    Button,
    Paper,
    Box,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    Chip,
} from '@mui/material';
import {
    SmartToy as SmartToyIcon,
    TrendingUp,
    AccountBalance,
    ShowChart,
    Psychology,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const GeminiInsights = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const sampleQueries = [
        "What's the current market sentiment?",
        "How should I diversify my portfolio?",
        "Analyze the tech sector trends",
        "Explain the impact of interest rates on stocks",
        "What are the best defensive stocks?",
        "How to identify undervalued stocks?"
    ];

    const handleAskAI = async (customQuery) => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.post(`${API_URL}/api/ai-insights/market-analysis`, {
                query: customQuery || query || 'Provide a market analysis'
            });
            setResponse(response.data.analysis);
            if (!customQuery) setQuery('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to get AI insights');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header Section */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: 4, 
                    mb: 4, 
                    background: 'linear-gradient(45deg, #1a237e, #0d47a1)',
                    color: 'white',
                    borderRadius: '16px'
                }}
            >
                <Grid container alignItems="center" spacing={3}>
                    <Grid item>
                        <SmartToyIcon sx={{ fontSize: 40 }} />
                    </Grid>
                    <Grid item xs>
                        <Typography variant="h4" gutterBottom>
                            Gemini AI Market Insights
                        </Typography>
                        <Typography variant="subtitle1">
                            Get AI-powered analysis and insights for your investment decisions
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Quick Access Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <TrendingUp color="primary" />
                                <Typography variant="h6">Market Analysis</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Get real-time market trends, sentiment analysis, and sector insights
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <AccountBalance color="primary" />
                                <Typography variant="h6">Portfolio Insights</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Receive personalized portfolio recommendations and risk analysis
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <ShowChart color="primary" />
                                <Typography variant="h6">Stock Analysis</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Deep dive into individual stocks with technical and fundamental analysis
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Query Section */}
            <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: '12px' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Psychology color="primary" />
                    Ask Gemini AI
                </Typography>
                
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything about markets, stocks, or your portfolio..."
                    sx={{ mb: 2 }}
                />
                
                <Box sx={{ mb: 3 }}>
                    <Button
                        variant="contained"
                        onClick={() => handleAskAI()}
                        disabled={loading}
                        startIcon={<SmartToyIcon />}
                        sx={{ mr: 2 }}
                    >
                        Get AI Analysis
                    </Button>
                    {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                    Try these sample questions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {sampleQueries.map((sampleQuery, index) => (
                        <Chip
                            key={index}
                            label={sampleQuery}
                            onClick={() => handleAskAI(sampleQuery)}
                            clickable
                            color="primary"
                            variant="outlined"
                            sx={{ mb: 1 }}
                        />
                    ))}
                </Box>
            </Paper>

            {/* Response Section */}
            {error && (
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        mb: 4, 
                        backgroundColor: '#fff3f3',
                        color: '#d32f2f',
                        borderRadius: '12px'
                    }}
                >
                    <Typography>{error}</Typography>
                </Paper>
            )}

            {response && (
                <Paper 
                    elevation={2} 
                    sx={{ 
                        p: 4, 
                        borderRadius: '12px',
                        backgroundColor: '#f8f9fa'
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        AI Analysis
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            whiteSpace: 'pre-line',
                            lineHeight: 1.8
                        }}
                    >
                        {response}
                    </Typography>
                </Paper>
            )}
        </Container>
    );
};

export default GeminiInsights; 