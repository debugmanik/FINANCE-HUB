import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import DecisionHub from './components/DecisionHub';
import { getExpensesAPI, getPortfolioAPI, getProfileAPI } from './services/api';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [metrics, setMetrics] = useState({
    income: 0,
    spending: 0,
    balance: 0,
    savingsRate: 0,
    totalInvested: 0,
    portfolioValue: 0,
    loading: true
  });

  const fetchGlobalMetrics = useCallback(async () => {
    try {
      const [profile, expenses, portfolio] = await Promise.all([
        getProfileAPI(),
        getExpensesAPI(),
        getPortfolioAPI()
      ]);
      
      const income = profile.data.monthlyIncome || 0;
      const spending = expenses.data.reduce((sum, e) => sum + e.amount, 0);
      const totalInvested = portfolio.data.summary?.totalInvested || 0;
      const portfolioValue = portfolio.data.summary?.totalCurrentValue || totalInvested;
      const balance = income - spending - totalInvested;
      const savingsRate = income > 0 ? ((income - spending) / income) * 100 : 0;

      setMetrics({ 
        income, spending, balance, savingsRate, 
        totalInvested, portfolioValue, loading: false 
      });
    } catch (err) {
      console.error('Global Metrics Sync Failed');
      // Ensure we don't stay in a perpetual loading state
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard 
                    metrics={metrics} 
                    onUpdate={fetchGlobalMetrics} 
                  />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/decision-hub" 
              element={
                <ProtectedRoute>
                  <DecisionHub 
                    metrics={metrics} 
                    onUpdate={fetchGlobalMetrics} 
                  />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;