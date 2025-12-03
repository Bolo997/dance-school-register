
import React, { useMemo, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { Insegnante, PagamentoInsegnante } from '../types';
import { formatPrice } from '../utils/helpers';
import { ERROR_MESSAGES } from '../constants';

const MESI = ['Settembre', 'Ottobre', 'Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio'];
const SETTIMANE = [1, 2, 3, 4, 5];

const Insegnanti: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: insegnanti } = useSupabaseData<Insegnante>('Insegnanti', { userName: profile?.userName || 'Unknown' });
  const { data: pagamenti, create: createPagamento, update: updatePagamento, remove: removePagamento } = useSupabaseData<PagamentoInsegnante>('PagamentiInsegnanti', { userName: profile?.userName || 'Unknown' });
  const { errors, validate, clearAllErrors } = useFormValidation();
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<PagamentoInsegnante | null>(null);
  const [form, setForm] = useState<Partial<PagamentoInsegnante>>({});
  const [loading, setLoading] = useState(false);

  // Rimuovi duplicati basandoti sul cognome e ordina alfabeticamente
  const insegnantiUnici = useMemo(() => {
    const cognomiSet = new Set<string>();
    const unici = insegnanti.filter(ins => {
      if (cognomiSet.has(ins.cognome)) {
        return false;
      }
      cognomiSet.add(ins.cognome);
      return true;
    });
    return [...unici].sort((a, b) => a.cognome.localeCompare(b.cognome));
  }, [insegnanti]);

  const insegnanteSelezionato = insegnantiUnici[selectedTab];

  const pagamentiInsegnante = useMemo(() => {
    if (!insegnanteSelezionato) return [];
    return pagamenti.filter(p => p.idInsegnante === insegnanteSelezionato.id);
  }, [pagamenti, insegnanteSelezionato]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleOpenDialog = useCallback((pagamento?: PagamentoInsegnante, settimana?: number, mese?: string, disciplina?: string) => {
    if (pagamento) {
      setEditingPagamento(pagamento);
      setForm(pagamento);
    } else {
      // Prendi l'importo dalla disciplina specifica se disponibile
      let importoDefault = 0;
      if (disciplina && insegnanteSelezionato?.discipline && insegnanteSelezionato.discipline.length > 0) {
        const disciplinaTrovata = insegnanteSelezionato.discipline.find(disc => {
          const parts = disc.split(';');
          const materia = parts[0]?.trim() || '';
          return materia === disciplina;
        });
        
        if (disciplinaTrovata) {
          const parts = disciplinaTrovata.split(';');
          importoDefault = parseFloat(parts[2]?.trim() || '0') || 0;
        }
      }
      
      setEditingPagamento(null);
      setForm({
        idInsegnante: insegnanteSelezionato?.id,
        disciplina: disciplina || '',
        settimana: settimana,
        mese: mese,
        data: new Date().toISOString().split('T')[0],
        compensoLezione: importoDefault,
        tariffa: ''
      });
    }
    clearAllErrors();
    setOpenDialog(true);
  }, [insegnanteSelezionato, clearAllErrors]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingPagamento(null);
    setForm({});
    clearAllErrors();
  }, [clearAllErrors]);

  const handleChange = useCallback((field: keyof PagamentoInsegnante, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    clearAllErrors();
    const isValid = validate(form, {
      disciplina: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('disciplina') },
      settimana: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('settimana') },
      mese: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('mese') },
      data: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('data') },
      compensoLezione: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('compenso') },
      tariffa: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('tariffa') },
    });
    if (!isValid) {
      setLoading(false);
      return;
    }
    
    let result;
    if (editingPagamento) {
      result = await updatePagamento(editingPagamento.id, form);
    } else {
      result = await createPagamento(form);
    }
    
    if (result.success) {
      handleCloseDialog();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo pagamento?')) {
      setLoading(true);
      await removePagamento(id);
      setLoading(false);
    }
  };

  const getPagamentoPerCella = (settimana: number, mese: string, disciplina: string) => {
    return pagamentiInsegnante.filter(p => 
      Number(p.settimana) === settimana && 
      p.mese === mese && 
      p.disciplina === disciplina
    );
  };

  const calcoloTotaleMese = (mese: string) => {
    const pagamentiMese = pagamentiInsegnante.filter(p => p.mese === mese);
    return pagamentiMese.reduce((sum, p) => sum + (p.compensoLezione || 0), 0);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Registro Insegnanti
      </Typography>
      <Button variant="contained" color="primary" sx={{ mb: 3 }} onClick={() => navigate('/gestione-insegnanti')}>
        Gestione Insegnanti
      </Button>
      
      {insegnantiUnici.length > 0 && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={selectedTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              {insegnantiUnici.map((insegnante) => (
                <Tab key={insegnante.id} label={insegnante.cognome} />
              ))}
            </Tabs>
          </Box>

          {insegnanteSelezionato && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ bgcolor: '#f5e6d3', p: 2, mb: 2, maxWidth: 600 }}>
                <Typography variant="h6">{insegnanteSelezionato.cognome} {insegnanteSelezionato.nome}</Typography>
                <Box component="div">
                  {insegnanteSelezionato.discipline && insegnanteSelezionato.discipline.length > 0 && 
                    insegnanteSelezionato.discipline.map((disc, idx) => {
                      const parts = disc.split(';');
                      const materia = parts[0]?.trim() || '';
                      const ora = parts[1]?.trim() || '';
                      const importo = parts[2]?.trim() || '';
                      return (
                        <Typography key={idx} variant="body2">
                          Disciplina: {materia} | Ore: {ora} | Importo: {formatPrice(parseFloat(importo) || 0)}
                        </Typography>
                      );
                    })
                  }
                </Box>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>SETTIMANA</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>DISCIPLINA</TableCell>
                      {MESI.map((mese, idx) => (
                        <TableCell 
                          key={mese} 
                          align="center" 
                          colSpan={3}
                          sx={{ 
                            fontWeight: 'bold', 
                            bgcolor: idx % 2 === 0 ? '#e8f5e9' : '#fff9c4',
                            borderLeft: '2px solid #ddd'
                          }}
                        >
                          <Box>
                            {mese.toUpperCase()}
                            <Typography variant="caption" display="block">
                              € {calcoloTotaleMese(mese).toFixed(2)}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f5f5f5' }}></TableCell>
                      <TableCell sx={{ bgcolor: '#f5f5f5' }}></TableCell>
                      {MESI.map((mese, idx) => (
                        <React.Fragment key={mese}>
                          <TableCell align="center" sx={{ fontSize: '0.75rem', bgcolor: idx % 2 === 0 ? '#e8f5e9' : '#fff9c4', borderLeft: '2px solid #ddd', minWidth: 120 }}>COMP. LEZ.</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.75rem', bgcolor: idx % 2 === 0 ? '#e8f5e9' : '#fff9c4', minWidth: 100 }}>DATA</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.75rem', bgcolor: idx % 2 === 0 ? '#e8f5e9' : '#fff9c4', minWidth: 80 }}>TARIFFA</TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {SETTIMANE.map((settimana) => (
                      <React.Fragment key={settimana}>
                        {insegnanteSelezionato.discipline && insegnanteSelezionato.discipline.map((disc, discIdx) => {
                          const parts = disc.split(';');
                          const materia = parts[0]?.trim() || '';
                          
                          return (
                            <TableRow key={`${settimana}-${discIdx}`} sx={{ bgcolor: settimana % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                              {discIdx === 0 && (
                                <TableCell rowSpan={insegnanteSelezionato.discipline.length} sx={{ fontWeight: 'bold', bgcolor: 'inherit' }}>
                                  {settimana}° SETTIMANA
                                </TableCell>
                              )}
                              <TableCell sx={{ bgcolor: 'inherit' }}>{materia}</TableCell>
                              {MESI.map((mese, idx) => {
                                const pagamentiCella = getPagamentoPerCella(settimana, mese, materia);
                                return (
                                  <React.Fragment key={mese}>
                                    <TableCell 
                                      align="center" 
                                      sx={{ 
                                        bgcolor: settimana % 2 === 0 
                                          ? (idx % 2 === 0 ? '#e8f5e9' : '#fffacd') 
                                          : (idx % 2 === 0 ? '#f1f8f4' : '#fffde7'),
                                        borderLeft: '2px solid #ddd',
                                        position: 'relative',
                                        minWidth: 120,
                                        '&:hover .add-button': { opacity: 1 }
                                      }}
                                    >
                                      {pagamentiCella.length > 0 ? (
                                        <Box>
                                          {pagamentiCella.map(p => (
                                            <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                              {profile?.role === "admin" && (
                                        <IconButton 
                                          size="small" 
                                          className="add-button"
                                          onClick={() => handleOpenDialog(undefined, settimana, mese, materia)}
                                          sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                                        >
                                          <AddIcon fontSize="small" />
                                        </IconButton>)}
                                              <Typography variant="body2">{p.compensoLezione.toFixed(2)}</Typography>
                                              {profile?.role === "admin" && (<IconButton size="small" onClick={() => handleOpenDialog(p)}>
                                                <EditIcon fontSize="small" />
                                              </IconButton>)}
                                              {profile?.role === "admin" && (<IconButton size="small" onClick={() => handleDelete(p.id)}>
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>)}
                                            </Box>
                                          ))}
                                        </Box>
                                      ) : profile?.role === "admin" && (
                                        <IconButton 
                                          size="small" 
                                          className="add-button"
                                          onClick={() => handleOpenDialog(undefined, settimana, mese, materia)}
                                          sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                                        >
                                          <AddIcon fontSize="small" />
                                        </IconButton>)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ 
                                      bgcolor: settimana % 2 === 0 
                                        ? (idx % 2 === 0 ? '#e8f5e9' : '#fffacd') 
                                        : (idx % 2 === 0 ? '#f1f8f4' : '#fffde7'),
                                      minWidth: 100 
                                    }}>
                                      {pagamentiCella.map(p => (
                                        <Typography key={p.id} variant="caption" display="block">
                                          {new Date(p.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </Typography>
                                      ))}
                                    </TableCell>
                                    <TableCell align="center" sx={{ 
                                      bgcolor: settimana % 2 === 0 
                                        ? (idx % 2 === 0 ? '#e8f5e9' : '#fffacd') 
                                        : (idx % 2 === 0 ? '#f1f8f4' : '#fffde7'),
                                      minWidth: 80 
                                    }}>
                                      {pagamentiCella.map(p => (
                                        <Typography key={p.id} variant="body2" display="block">{p.tariffa}</Typography>
                                      ))}
                                    </TableCell>
                                  </React.Fragment>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPagamento ? 'Modifica Pagamento' : 'Nuovo Pagamento'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Disciplina"
              value={form.disciplina || ''}
              onChange={(e) => handleChange('disciplina', e.target.value)}
              fullWidth
              error={!!errors.disciplina}
              helperText={errors.disciplina}
              disabled={!!editingPagamento}
            >
              {insegnanteSelezionato?.discipline && insegnanteSelezionato.discipline.map((disc, idx) => {
                const parts = disc.split(';');
                const materia = parts[0]?.trim() || '';
                return (
                  <MenuItem key={idx} value={materia}>{materia}</MenuItem>
                );
              })}
            </TextField>
            <TextField
              select
              label="Settimana"
              value={form.settimana || ''}
              onChange={(e) => handleChange('settimana', Number(e.target.value))}
              fullWidth
              error={!!errors.settimana}
              helperText={errors.settimana}
            >
              {SETTIMANE.map((s) => (
                <MenuItem key={s} value={s}>{s}° Settimana</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Mese"
              value={form.mese || ''}
              onChange={(e) => handleChange('mese', e.target.value)}
              fullWidth
              error={!!errors.mese}
              helperText={errors.mese}
            >
              {MESI.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data"
              type="date"
              value={form.data || ''}
              onChange={(e) => handleChange('data', e.target.value)}
              fullWidth
              error={!!errors.data}
              helperText={errors.data}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Compenso Lezione €"
              type="number"
              value={form.compensoLezione || ''}
              onChange={(e) => handleChange('compensoLezione', Number(e.target.value))}
              fullWidth
              error={!!errors.compensoLezione}
              helperText={errors.compensoLezione}
            />
            <TextField
              label="Tariffa"
              value={form.tariffa || ''}
              onChange={(e) => handleChange('tariffa', e.target.value)}
              fullWidth
              error={!!errors.tariffa}
              helperText={errors.tariffa}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annulla</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Insegnanti;
