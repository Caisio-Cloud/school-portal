import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer } from 'react-hot-toast';

// Layout components
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';

// Protected pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import StudentDashboard from './pages/student/Dashboard';
import FacultyDashboard from './pages/faculty/Dashboard';

// Context
import { AuthProvider } from './context/AuthContext';

// Configure axios
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/admin" element={<ProtectedRoute role="Admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          
          <Route path="/student" element={<ProtectedRoute role="Student" />}>
            <Route index element={<StudentDashboard />} />
          </Route>
          
          <Route path="/faculty" element={<ProtectedRoute role="Faculty" />}>
            <Route index element={<FacultyDashboard />} />
          </Route>
          
          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
        <ToastContainer position="top-right" />
      </Router>
    </AuthProvider>
  );
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (role && user.accountType !== role) {
    return <Navigate to={`/${user.accountType.toLowerCase()}`} />;
  }
  
  return <Layout>{children}</Layout>;
}

export default App;
