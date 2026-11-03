import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-[#245CE2] rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-500">Verifying session credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const currentRole = (role || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === currentRole);

    if (!isAllowed) {
      // Role unauthorized: redirect to appropriate portal
      if (currentRole === 'admin') return <Navigate to="/admin" replace />;
      if (currentRole === 'employee') return <Navigate to="/employee" replace />;
      if (currentRole === 'customer') return <Navigate to="/customer" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  return children ? children : <Outlet />;
};

