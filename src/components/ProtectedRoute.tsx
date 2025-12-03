import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}


const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  // Mostra loader se lo stato auth è in caricamento
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Se non autenticato, reindirizza al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se il ruolo non è consentito, reindirizza alla home
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  // Altrimenti mostra i children
  return <>{children}</>;
};

export default ProtectedRoute;
