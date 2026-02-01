
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { Insegnante, PagamentoInsegnante } from '../types';
import { formatPrice } from '../utils/helpers';
import { ERROR_MESSAGES } from '../constants';
import SuccessDialog from '../components/SuccessDialog';
import { exportPagamentiInsegnantiExcel } from '../utils/exportPagamentiInsegnantiExcel';
import { logOperation } from '../utils/logs';

const MESI = ['Settembre', 'Ottobre', 'Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio'];
const SETTIMANE = [1, 2, 3, 4, 5];

// Converte una data (ISO yyyy-mm-dd o già dd/mm/yyyy) nel formato dd/mm/yyyy
const formatDateToItalian = (value: string | undefined | null): string => {
  if (!value) return '';
  const val = value.toString();

  if (val.includes('/')) {
    return val;
  }

  const parts = val.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  return val;
};

// Converte una data dd/mm/yyyy (o già ISO) in formato ISO yyyy-mm-dd per l'input type="date"
const parseDateToIso = (value: string | undefined | null): string => {
  if (!value) return '';
  const val = value.toString();

  if (val.includes('-')) {
    return val;
  }

  const parts = val.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 4) {
      return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return val;
};

const Insegnanti: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: insegnanti, loading: loadingInsegnanti } = useSupabaseData<Insegnante>('Insegnanti', { userName: profile?.userName || 'Unknown' });
  const { data: pagamenti, create: createPagamento, update: updatePagamento, remove: removePagamento, loading: loadingPagamenti } = useSupabaseData<PagamentoInsegnante>('PagamentiInsegnanti', { userName: profile?.userName || 'Unknown' });
  const { errors, validate, clearAllErrors } = useFormValidation();
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<PagamentoInsegnante | null>(null);
  const [form, setForm] = useState<Partial<PagamentoInsegnante>>({});
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

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
      setForm({
        ...pagamento,
        data: parseDateToIso(pagamento.data),
      });
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
    
    const payload = {
      ...form,
      data: formatDateToItalian(form.data as string),
    };

    let result;
    if (editingPagamento) {
      result = await updatePagamento(editingPagamento.id, payload);
    } else {
      result = await createPagamento(payload);
    }
    
    if (result.success) {
      const isUpdate = !!editingPagamento;
      const idInsegnante = (form.idInsegnante || editingPagamento?.idInsegnante || '').toString();
      const disciplina = (form.disciplina || editingPagamento?.disciplina || '').toString();
      const mese = (form.mese || editingPagamento?.mese || '').toString();
      const data = formatDateToItalian((form.data || editingPagamento?.data || '').toString());
      const compensoValue = form.compensoLezione ?? editingPagamento?.compensoLezione ?? 0;
      const elemento = `idIns ${idInsegnante}: ${disciplina}-${mese}-${data}-${compensoValue}` + "€";

      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione: isUpdate ? 'Modifica' : 'Creazione',
        lista: 'PagamentiInsegnanti',
        elemento
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log pagamento insegnante:', error);
      });

      handleCloseDialog();
      setOpenSuccess(true);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo pagamento?')) {
      setDeleteLoading(true);
      const pagamentoToDelete = pagamenti.find((p) => p.id === id);
      const deleteResult = await removePagamento(id);

      if (deleteResult.success && pagamentoToDelete) {
        const compensoValue = pagamentoToDelete.compensoLezione ?? 0;
        const data = formatDateToItalian(pagamentoToDelete.data);
        const elemento = `idIns ${pagamentoToDelete.idInsegnante}: ${pagamentoToDelete.disciplina}-${pagamentoToDelete.mese}-${data}-${compensoValue}`;

        logOperation({
          utente: profile?.userName || 'Unknown',
          tipoOperazione: 'Eliminazione',
          lista: 'PagamentiInsegnanti',
          elemento
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Errore durante la scrittura del log pagamento insegnante:', error);
        });
      }

      setDeleteLoading(false);
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

  const pagamentiExcelColumns = [
    { key: 'cognome', label: 'Cognome' },
    { key: 'nome', label: 'Nome' },
    { key: 'disciplina', label: 'Disciplina' },
    { key: 'settimana', label: 'Settimana' },
    { key: 'mese', label: 'Mese' },
    { key: 'data', label: 'Data' },
    { key: 'compensoLezione', label: 'Compenso', format: (val: number) => formatPrice(val || 0) },
    { key: 'tariffa', label: 'Tariffa' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Registro Insegnanti
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/gestione-insegnanti')}>
          Gestione Insegnanti
        </Button>
        {profile?.role !== 'reader' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            sx={{ fontWeight: 600, textTransform: 'none' }}
            onClick={() => {
              if (!insegnanteSelezionato) return;
              const rows = pagamentiInsegnante.map((p) => ({
                cognome: insegnanteSelezionato.cognome,
                nome: insegnanteSelezionato.nome,
                disciplina: p.disciplina,
                settimana: p.settimana,
                mese: p.mese,
                data: new Date(p.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                compensoLezione: p.compensoLezione,
                tariffa: p.tariffa,
              }));
              exportPagamentiInsegnantiExcel(rows, pagamentiExcelColumns);
            }}
          >
            Export Excel
          </Button>
        )}
      </Box>
      {(loadingInsegnanti || loadingPagamenti || deleteLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}
      
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
                                          {formatDateToItalian(p.data)}
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

      <SuccessDialog
        open={openSuccess}
        onClose={() => setOpenSuccess(false)}
      />

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
