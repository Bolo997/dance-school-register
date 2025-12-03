import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CategoryIcon from '@mui/icons-material/Category';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { CategoriaCorso, Corso, InfoSito } from '../types';
import { GIORNI_SETTIMANA } from '../constants';
import { AutoStories } from '@mui/icons-material';

const OrarioAnnoAccademico: React.FC = () => {
  const navigate = useNavigate();
  const { data: categorie, loading: loadingCategorie } = useSupabaseData<CategoriaCorso>('CategorieCorsi');
  const { data: corsi, loading: loadingCorsi } = useSupabaseData<Corso>('Corsi');
  const { data: infoSito } = useSupabaseData<InfoSito>('InfoSito');
  const [expandedCategorie, setExpandedCategorie] = useState<Set<string>>(new Set());

  const anno = useMemo(() => infoSito.find(info => info.campo === 'anno')?.valore || '', [infoSito]);

  const handleAccordionChange = useCallback((categoriaId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCategorie(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(categoriaId);
      } else {
        newSet.delete(categoriaId);
      }
      return newSet;
    });
  }, []);

  const getCorsiForCategoriaAndDay = useCallback((categoria: string, giornoSettimana: string): Corso[] => {
    return corsi.filter((corso) => {
      if (corso.categoria !== categoria) return false;
      // Verifica se almeno una lezione è nel giorno specificato
      return corso.lezioni?.some(lezione => {
        const parts = lezione.split(';');
        const giorno = parts[0]?.trim() || '';
        return giorno === giornoSettimana;
      });
    }).sort((a, b) => {
      // Ordina per ora di inizio della prima lezione del giorno
      const getFirstOrario = (corso: Corso) => {
        const lezione = corso.lezioni?.find(l => {
          const parts = l.split(';');
          return parts[0]?.trim() === giornoSettimana;
        });
        if (!lezione) return '99:99';
        const parts = lezione.split(';');
        const orario = parts[2]?.trim() || '99:99';
        return orario.substring(0, 5);
      };
      const oraA = getFirstOrario(a);
      const oraB = getFirstOrario(b);
      return oraA.localeCompare(oraB);
    });
  }, [corsi]);

  if (loadingCategorie || loadingCorsi) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4, mb: 3 }}>
        Orario Anno Accademico {anno}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<AutoStories />}
          onClick={() => navigate('/corsi-sale/corsi')}
        >
          Gestione Corsi
        </Button>
        <Button
          variant="contained"
          startIcon={<MeetingRoomIcon />}
          onClick={() => navigate('/corsi-sale/sale')}
        >
          Gestione Sale
        </Button>
        <Button
          variant="contained"
          startIcon={<CategoryIcon />}
          onClick={() => navigate('/corsi-sale/categorie')}
        >
          Categorie Corso
        </Button>
      </Box>

      {categorie.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Nessuna categoria trovata. Usa i bottoni sopra per aggiungere categorie, sale e corsi.
          </Typography>
        </Box>
      ) : (
        [...categorie].sort((a, b) => a.categoria.localeCompare(b.categoria)).map((categoria) => {
          const corsiCategoria = corsi.filter((corso) => corso.categoria === categoria.categoria);
          const corsiUnici = Array.from(
            new Map(corsiCategoria.map(corso => [corso.nomeCorso, corso])).values()
          ).sort((a, b) => a.nomeCorso.localeCompare(b.nomeCorso));

          return (
            <Accordion
              key={categoria.id}
              expanded={expandedCategorie.has(categoria.id)}
              onChange={handleAccordionChange(categoria.id)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ backgroundColor: categoria.colore + '20' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: categoria.colore,
                      border: '1px solid #ccc'
                    }}
                  />
                  <Typography variant="h6">{categoria.categoria}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} sx={{ border: `2px solid ${categoria.colore}` }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: categoria.colore + '30' }}>
                        <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>
                          Nome Corso
                        </TableCell>
                        {GIORNI_SETTIMANA.map((giorno) => (
                          <TableCell
                            key={giorno}
                            align="center"
                            sx={{ fontWeight: 'bold', py: 0.5 }}
                          >
                            {giorno}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {corsiUnici.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              Nessun corso programmato per questa categoria
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        corsiUnici.map((corso) => (
                          <TableRow key={corso.id} sx={{ height: '32px' }}>
                            <TableCell sx={{ fontWeight: 'medium', py: 0.25 }}>
                              {corso.nomeCorso}
                            </TableCell>
                            {GIORNI_SETTIMANA.map((giorno) => {
                              const corsiInSlot = getCorsiForCategoriaAndDay(categoria.categoria, giorno).filter(
                                (c) => c.nomeCorso === corso.nomeCorso
                              );
                              return (
                                <TableCell key={giorno} align="center" sx={{ py: 0.25 }}>
                                  {corsiInSlot.map((c) => {
                                    // Trova le lezioni per questo giorno
                                    const lezioniGiorno = c.lezioni?.filter(lezione => {
                                      const parts = lezione.split(';');
                                      return parts[0]?.trim() === giorno;
                                    }) || [];
                                    
                                    return lezioniGiorno.map((lezione, idx) => {
                                      const parts = lezione.split(';');
                                      const sala = parts[1]?.trim() || '';
                                      const orario = parts[2]?.trim() || '';
                                      return (
                                        <Box key={`${c.id}-${idx}`} sx={{ mb: 0.25 }}>
                                          <Typography variant="body2" fontWeight="medium" fontSize="0.85rem">
                                            {sala}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                            {orario}
                                          </Typography>
                                        </Box>
                                      );
                                    });
                                  })}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}
    </Container>
  );
};

export default OrarioAnnoAccademico;
