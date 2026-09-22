import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // If not logged in, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role not authorized for this specific route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Kasir trying to access Admin routes -> redirect to Kasir POS
    return <Navigate to="/kasir" replace />;
  }

  return children;
};
