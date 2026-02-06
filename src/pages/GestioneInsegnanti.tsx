import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import ErrorDialog from '../components/ErrorDialog';
import SuccessDialog from '../components/SuccessDialog';
import { Insegnante, Corso, CategoriaCorso } from '../types';
import { PagamentoInsegnante } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { formatPrice } from '../utils/helpers';
import { ERROR_MESSAGES } from '../constants';
import { MenuItem } from '@mui/material';
import { exportInsegnantiExcel } from '../utils/exportInsegnantiExcel';
import { logOperation } from '../utils/logs';

const formatDiscipline = (discipline: string[]) => {
  if (!discipline || discipline.length === 0) return '';
  return (
    <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
      {discipline.map((disc, index) => {
        const parts = disc.split(';');
        const materia = parts[0]?.trim() || '';
        const ora = parts[1]?.trim() || '';
        const importo = parts[2]?.trim() || '';
        return (
          <li key={index}>
            {materia} - {ora}h - {formatPrice(parseFloat(importo) || 0)}
          </li>
        );
      })}
    </Box>
  );
};

const insegnantiColumns = [
  { key: 'id', label: 'Id', width: '5%' },
  { key: 'cognome', label: 'Cognome', width: '25%' },
  { key: 'nome', label: 'Nome', width: '25%' },
  { key: 'discipline', label: 'Discipline', format: formatDiscipline, width: '50%' },
];

const insegnantiExcelColumns = [
  { key: 'id', label: 'Id' },
  { key: 'cognome', label: 'Cognome' },
  { key: 'nome', label: 'Nome' },
  {
    key: 'discipline',
    label: 'Discipline',
    format: (discipline: string[]) => {
      if (!discipline || discipline.length === 0) return '';
      return discipline
        .map((disc) => {
          const parts = disc.split(';');
          const materia = parts[0]?.trim() || '';
          const ora = parts[1]?.trim() || '';
          const importo = parts[2]?.trim() || '';
          return `${materia} - ${ora}h - ${formatPrice(parseFloat(importo) || 0)}`;
        })
        .join('\n');
    },
  },
];

const GestioneInsegnanti: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: insegnanti, create, update, remove, loading: loadingInsegnanti } = useSupabaseData<Insegnante>('Insegnanti', { userName: profile?.userName || 'Unknown' });
  const { data: pagamentiInsegnanti, loading: loadingPagamentiInsegnanti } = useSupabaseData<PagamentoInsegnante>('PagamentoInsegnante', { userName: profile?.userName || 'Unknown' });
  const { errors, validate, clearAllErrors } = useFormValidation();
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [insegnanteToDelete, setInsegnanteToDelete] = useState<string | null>(null);
  const [openErrorDialog, setOpenErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingInsegnante, setEditingInsegnante] = useState<Insegnante | null>(null);
  const [form, setForm] = useState<Partial<Insegnante>>({});
  const [loading, setLoading] = useState(false);
  const [disciplinaTemp, setDisciplinaTemp] = useState('');
  const { data: corsi } = useSupabaseData<Corso>('Corsi', { userName: profile?.userName || 'Unknown' });
  const { data: categorie } = useSupabaseData<CategoriaCorso>('CategorieCorsi', { userName: profile?.userName || 'Unknown' });
  const nomiCorsiOrdinati = React.useMemo(() => {
    if (!corsi) return [];
      const corsiOrdinati = [...corsi].sort((a, b) => {
        const categoriaCompare = a.categoria.localeCompare(b.categoria);
    if (categoriaCompare !== 0) return categoriaCompare;
        return a.nomeCorso.localeCompare(b.nomeCorso);
    });
    return corsiOrdinati.map(c => c.nomeCorso);
    }, [corsi]);
  const [oraTemp, setOraTemp] = useState('');
  const [importoTemp, setImportoTemp] = useState('');
  const [discipline, setDiscipline] = useState<{disciplina: string, ora: string, importo: string}[]>([]);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const parseDiscipline = useCallback((disciplinaArray: string[]) => {
    if (!disciplinaArray || disciplinaArray.length === 0) {
      setDiscipline([]);
      return;
    }
    const parsed = disciplinaArray.map(item => {
      const parts = item.split(';');
      return { 
        disciplina: parts[0]?.trim() || '', 
        ora: parts[1]?.trim() || '', 
        importo: parts[2]?.trim() || '' 
      };
    });
    setDiscipline(parsed);
  }, []);

  const serializeDiscipline = useCallback((disciplineArray: {disciplina: string, ora: string, importo: string}[]) => {
    return disciplineArray.map(d => `${d.disciplina};${d.ora};${d.importo}`);
  }, []);

  const handleAggiungiDisciplina = useCallback(() => {
    if (!disciplinaTemp || !oraTemp || !importoTemp) {
      return;
    }
    
    const nuovaDisciplina = { disciplina: disciplinaTemp, ora: oraTemp, importo: importoTemp };
    setDiscipline(prev => [...prev, nuovaDisciplina]);
    setDisciplinaTemp('');
    setOraTemp('');
    setImportoTemp('');
    clearAllErrors();
  }, [disciplinaTemp, oraTemp, importoTemp, clearAllErrors]);

  const handleRimuoviDisciplina = useCallback((index: number) => {
    setDiscipline(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleOpenDialog = useCallback((insegnante?: Insegnante) => {
    if (insegnante) {
      setEditingInsegnante(insegnante);
      setForm(insegnante);
      parseDiscipline(insegnante.discipline || []);
    } else {
      setEditingInsegnante(null);
      setForm({});
      setDiscipline([]);
    }
    setDisciplinaTemp('');
    setOraTemp('');
    setImportoTemp('');
    clearAllErrors();
    setOpenDialog(true);
  }, [clearAllErrors, parseDiscipline]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingInsegnante(null);
    setForm({});
    setDiscipline([]);
    setDisciplinaTemp('');
    setOraTemp('');
    setImportoTemp('');
    clearAllErrors();
  }, [clearAllErrors]);

  const handleChange = useCallback((field: keyof Insegnante, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    clearAllErrors();
    const isValid = validate(form, {
      cognome: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('cognome') },
    });
    if (!isValid) {
      setLoading(false);
      return;
    }

    // Rimosso controllo disciplina obbligatoria
    
    const insegnanteData = {
      ...form,
      discipline: serializeDiscipline(discipline)
    };

    let result;
    const isUpdate = !!editingInsegnante;
    if (isUpdate) {
      result = await update(editingInsegnante.id, insegnanteData);
    } else {
      result = await create(insegnanteData);
    }
    
    if (!result.success && result.error?.code === '23505') {
      validate({ cognome: form.cognome }, {
        cognome: { 
          required: true, 
          message: 'Cognome insegnante già presente',
          customValidation: () => false
        }
      });
      setLoading(false);
      return;
    }
    
    if (result.success) {
      const elemento = `${insegnanteData.cognome || ''} ${insegnanteData.nome || ''}`.trim();
      const tipoOperazione = isUpdate ? 'Modifica' : 'Creazione';
      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione,
        lista: 'Insegnanti',
        elemento,
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log:', error);
      });
      handleCloseDialog();
      setOpenSuccess(true);
    }
    setLoading(false);
  };

  const handleDelete = useCallback((id: string) => {
    setInsegnanteToDelete(id);
    setOpenConfirmDelete(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (insegnanteToDelete) {
      // Blocca se ci sono pagamenti associati
      const hasPagamenti = pagamentiInsegnanti.some(p => p.idInsegnante === insegnanteToDelete);
      if (hasPagamenti) {
        setErrorMessage("Impossibile eliminare l'insegnante perché ha dei pagamenti associati. Elimina prima i pagamenti.");
        setOpenErrorDialog(true);
        setOpenConfirmDelete(false);
        setInsegnanteToDelete(null);
        return;
      }
      setDeleteLoading(true);
      const insegnante = insegnanti.find((i) => i.id === insegnanteToDelete);
      const result = await remove(insegnanteToDelete);
      if (!result.success && result.error?.code === '23503') {
        setErrorMessage("Impossibile eliminare l'insegnante perché ha dei pagamenti associati. Elimina prima i pagamenti.");
        setOpenErrorDialog(true);
      } else if (result.success && insegnante) {
        const elemento = `${insegnante.cognome} ${insegnante.nome}`.trim();
        logOperation({
          utente: profile?.userName || 'Unknown',
          tipoOperazione: 'Eliminazione',
          lista: 'Insegnanti',
          elemento,
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Errore durante la scrittura del log:', error);
        });
      }
      setOpenConfirmDelete(false);
      setInsegnanteToDelete(null);
      setDeleteLoading(false);
    }
  }, [insegnanteToDelete, remove]);

  const handleCancelDelete = useCallback(() => {
    setOpenConfirmDelete(false);
    setInsegnanteToDelete(null);
  }, []);

  const insegnantiOrdinati = [...insegnanti].sort((a, b) => a.cognome.localeCompare(b.cognome));

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/insegnanti')}
          sx={{ color: 'primary.main' }}
          title="Torna a Insegnanti"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Gestione Insegnanti
        </Typography>
        {profile?.role !== 'reader' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            sx={{ fontWeight: 600, textTransform: 'none', ml: 'auto' }}
            onClick={() => exportInsegnantiExcel(insegnantiOrdinati, insegnantiExcelColumns)}
          >
            Export Excel
          </Button>
        )}
      </Box>

      {(loadingInsegnanti || loadingPagamentiInsegnanti || deleteLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      <DataTable
        title="Insegnanti"
        columns={insegnantiColumns}
        data={insegnantiOrdinati}
        onAdd={() => handleOpenDialog()}
        onEdit={handleOpenDialog}
        onDelete={handleDelete}
        emptyMessage="Nessun insegnante presente"
      />

      <SuccessDialog
        open={openSuccess}
        onClose={() => setOpenSuccess(false)}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingInsegnante ? 'Modifica Insegnante' : 'Nuovo Insegnante'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nome"
              value={form.nome || ''}
              onChange={(e) => handleChange('nome', e.target.value)}
              fullWidth
              error={!!errors.nome}
              helperText={errors.nome}
            />
            <TextField
              label="Cognome"
              value={form.cognome || ''}
              onChange={(e) => handleChange('cognome', e.target.value)}
              fullWidth
              error={!!errors.cognome}
              helperText={errors.cognome}
            />
            
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 1, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>
              Aggiungi Disciplina
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Materia"
                  value={disciplinaTemp}
                  onChange={(e) => setDisciplinaTemp(e.target.value)}
                  fullWidth
                >
                  {nomiCorsiOrdinati.map((nomeCorso: string) => {
                    const corsoObj = corsi?.find((c: any) => c.nomeCorso === nomeCorso);
                    const corsoCat = corsoObj ? categorie?.find((cat: any) => cat.categoria === corsoObj.categoria) : null;
                    return (
                      <MenuItem key={nomeCorso} value={nomeCorso}>
                        <Box sx={{ px: 1, py: 0.5, borderRadius: 1, backgroundColor: (corsoCat?.colore ? corsoCat.colore + '40' : '#e3f2fd'), display: 'inline-block' }}>{nomeCorso}</Box>
                      </MenuItem>
                    );
                  })}
                </TextField>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Ore"
                    type="number"
                    value={oraTemp}
                    onChange={(e) => setOraTemp(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Importo €"
                    type="number"
                    value={importoTemp}
                    onChange={(e) => setImportoTemp(e.target.value)}
                    fullWidth
                  />
                  <Button 
                    variant="outlined" 
                    onClick={handleAggiungiDisciplina}
                    sx={{ minWidth: 120 }}
                  >
                    Aggiungi
                  </Button>
                </Box>
              </Stack>
            </Box>

            {discipline.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 1, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>
                  Discipline inserite
                </Typography>
                <Stack spacing={1}>
                  {discipline.map((disc, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid #ddd',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body2">
                        {disc.disciplina} - {disc.ora}h - €{disc.importo}
                      </Typography>
                      <Button 
                          size="small" 
                          color="error"
                          onClick={() => handleRimuoviDisciplina(index)}
                        >
                          Rimuovi
                        </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annulla</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmDelete} onClose={handleCancelDelete}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>Sei sicuro di voler eliminare questo insegnante?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Annulla</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Elimina</Button>
        </DialogActions>
      </Dialog>

      <ErrorDialog
        open={openErrorDialog}
        title="Errore"
        message={errorMessage}
        onClose={() => setOpenErrorDialog(false)}
        closeText="OK"
      />
    </Container>
  );
};

export default GestioneInsegnanti;
