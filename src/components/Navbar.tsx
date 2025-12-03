import React, { useState, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import CalculateIcon from '@mui/icons-material/Calculate';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import { useAuth } from '../contexts/AuthContext';

const Navbar = React.memo(() => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  }, [signOut, navigate, handleMenuClose]);

  const handleAdminClick = useCallback(() => {
    handleMenuClose();
    navigate('/amministrazione');
  }, [navigate, handleMenuClose]);

  // Sezione pulsanti di navigazione con icone corrispondenti alla Home
  const renderNavButtons = () => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button color="inherit" component={RouterLink} to="/preventivo" startIcon={<CalculateIcon />}>
        Calcolo Preventivo
      </Button>
      <Button color="inherit" component={RouterLink} to="/orario-anno-accademico" startIcon={<CalendarMonthIcon />}>
        Orario Anno Accademico
      </Button>
      <Button color="inherit" component={RouterLink} to="/soci" startIcon={<PeopleIcon />}>
        Registro Soci
      </Button>
      <Button color="inherit" component={RouterLink} to="/insegnanti" startIcon={<SchoolIcon />}>
        Registro Insegnanti
      </Button>
    </Box>
  );

  // Sezione menu utente
  const renderUserMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{ sx: { minWidth: 250 } }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {profile?.userName || profile?.full_name || 'Utente'}
        </Typography>
      </Box>
      <Divider />
      {profile?.role === 'admin' && (
        <>
          <MenuItem onClick={handleAdminClick}>
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" sx={{ color: 'red' }} />
            </ListItemIcon>
            Amministrazione
          </MenuItem>
          <Divider />
        </>
      )}
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        Esci
      </MenuItem>
    </Menu>
  );

  return (
    <AppBar position="sticky" sx={{ top: 0, zIndex: 1100 }}>
      <Toolbar>
        <IconButton color="inherit" component={RouterLink} to="/" edge="start" sx={{ mr: 2 }}>
          <HomeIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        {renderNavButtons()}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton color="inherit" onClick={handleMenuOpen} size="large">
          <AccountCircleIcon />
        </IconButton>
        {renderUserMenu()}
      </Toolbar>
    </AppBar>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
