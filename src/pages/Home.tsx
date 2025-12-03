import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import PeopleIcon from '@mui/icons-material/People';
import CalculateIcon from '@mui/icons-material/Calculate';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';

const Home: React.FC = () => {
  const sections = [ 
    { title: 'Calcolo Preventivo', path: '/preventivo', icon: <CalculateIcon sx={{ fontSize: 60 }} /> },
    { title: 'Orario Anno Accademico', path: '/orario-anno-accademico', icon: <CalendarMonthIcon sx={{ fontSize: 60 }} /> },
    { title: 'Registro Soci', path: '/soci', icon: <PeopleIcon sx={{ fontSize: 60 }} /> },
    { title: 'Registro Insegnanti', path: '/insegnanti', icon: <SchoolIcon sx={{ fontSize: 60 }} /> },
  ];

  return (
    <Container maxWidth="lg" sx={{ position: 'relative', minHeight: '100vh', pb: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        Centro Studi Danza
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
        {sections.map((section) => (
          <Box key={section.path} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea
                component={RouterLink}
                to={section.path}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 3 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {section.icon}
                  </Box>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default Home;
