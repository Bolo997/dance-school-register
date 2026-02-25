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
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useAuth } from '../contexts/AuthContext';

const Navbar = React.memo(() => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [academyAnchorEl, setAcademyAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleAcademyMenuToggle = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAcademyAnchorEl((prev) => (prev ? null : event.currentTarget));
  }, []);

  const handleAcademyMenuCloseNow = useCallback(() => {
    setAcademyAnchorEl(null);
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
      <Box sx={{ display: 'inline-flex' }}>
        <Button
          id="corsi-accademia-button"
          color="inherit"
          startIcon={<CalendarMonthIcon />}
          aria-controls={academyAnchorEl ? 'corsi-accademia-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={academyAnchorEl ? 'true' : undefined}
          onClick={handleAcademyMenuToggle}
        >
          Corsi e accademia
        </Button>
        <Menu
          id="corsi-accademia-menu"
          anchorEl={academyAnchorEl}
          open={Boolean(academyAnchorEl)}
          onClose={handleAcademyMenuCloseNow}
          disablePortal
          disableAutoFocusItem
          disableRestoreFocus
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          MenuListProps={{ 'aria-labelledby': 'corsi-accademia-button', autoFocusItem: false }}
          PaperProps={{ sx: { minWidth: 260, mt: 1 } }}
        >
          <MenuItem component={RouterLink} to="/orario-anno-accademico" onClick={handleAcademyMenuCloseNow}>
            <ListItemIcon>
              <CalendarMonthIcon fontSize="small" />
            </ListItemIcon>
            Orario anno accademico
          </MenuItem>
          <MenuItem component={RouterLink} to="/accademia" onClick={handleAcademyMenuCloseNow}>
            <ListItemIcon>
              <WorkspacePremiumIcon fontSize="small" />
            </ListItemIcon>
            Accademia
          </MenuItem>
          <MenuItem component={RouterLink} to="/corsi-sale/corsi" onClick={handleAcademyMenuCloseNow}>
            <ListItemIcon>
              <MenuBookIcon fontSize="small" />
            </ListItemIcon>
            Gestione corsi
          </MenuItem>
        </Menu>
      </Box>
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
