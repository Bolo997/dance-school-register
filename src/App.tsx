import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Soci = lazy(() => import('./pages/Soci'));
const Insegnanti = lazy(() => import('./pages/Insegnanti'));
const CalcoloPreventivo = lazy(() => import('./pages/CalcoloPreventivo'));
const OrarioAnnoAccademico = lazy(() => import('./pages/OrarioAnnoAccademico'));
const GestioneCorsi = lazy(() => import('./pages/GestioneCorsi'));
const GestioneSale = lazy(() => import('./pages/GestioneSale'));
const GestioneTipologie = lazy(() => import('./pages/GestioneTipologie'));
const Accademia = lazy(() => import('./pages/Accademia'));
const GestioneSoci = lazy(() => import('./pages/GestioneSoci'));
const GestioneInsegnanti = lazy(() => import('./pages/GestioneInsegnanti'));
const ModuloIscrizione = lazy(() => import('./pages/ModuloIscrizione'));
const Amministrazione = lazy(() => import('./pages/Amministrazione'));

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                      <Navbar />
                      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                        <Suspense fallback={<LoadingFallback />}>
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/soci" element={<Soci />} />
                            <Route path="/insegnanti" element={<Insegnanti />} />
                            <Route path="/preventivo" element={<CalcoloPreventivo />} />
                            <Route path="/orario-anno-accademico" element={<OrarioAnnoAccademico />} />
                            <Route path="/accademia" element={<Accademia />} />
                            <Route path="/gestione-soci" element={<GestioneSoci />} />
                            <Route path="/modulo-iscrizione/:id" element={<ModuloIscrizione />} />
                            <Route path="/gestione-insegnanti" element={<GestioneInsegnanti />} />
                            <Route path="/amministrazione" element={<Amministrazione />} />
                            <Route path="/corsi-sale/corsi" element={<GestioneCorsi />} />
                            <Route path="/corsi-sale/sale" element={<GestioneSale />} />
                            <Route path="/corsi-sale/categorie" element={<GestioneTipologie />} />
                          </Routes>
                        </Suspense>
                      </Box>
                    </Box>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
