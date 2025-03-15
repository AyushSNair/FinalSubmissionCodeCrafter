import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./Login";
import Home from "./Home";
import Stocks from "./Stocks";
import Portfolio from "./Portfolio";
import BuyStock from "./BuyStock";
import SellStock from "./SellStock";
import StockDetails from "./StockDetails";
import StockCompare from "./StockCompare";
import StockRecommendations from "./StockRecommendations";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/home" />} />
          
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stocks" 
            element={
              <ProtectedRoute>
                <Stocks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portfolio" 
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/recommendations" 
            element={
              <ProtectedRoute>
                <StockRecommendations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/buy/:symbol" 
            element={
              <ProtectedRoute>
                <BuyStock />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sell/:symbol" 
            element={
              <ProtectedRoute>
                <SellStock />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stock/:symbol" 
            element={
              <ProtectedRoute>
                <StockDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stocks/compare/:symbol" 
            element={
              <ProtectedRoute>
                <StockCompare />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
