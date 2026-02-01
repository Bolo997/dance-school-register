import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import WarningDialog from '../components/WarningDialog';
import SuccessDialog from '../components/SuccessDialog';
import { Corso, Sala, CategoriaCorso, Socio, Insegnante } from '../types';
import { formatPrice, createOrario, validateTimeRange } from '../utils/helpers';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { useTimeSlots } from '../hooks/useTimeSlots';
import { ERROR_MESSAGES, GIORNI_SETTIMANA } from '../constants';
import { exportCorsiExcel } from '../utils/exportCorsiExcel';
import { logOperation } from '../utils/logs';

const formatLezioni = (lezioni: string[]) => {
  if (!lezioni || lezioni.length === 0) return '';
  return (
    <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
      {lezioni.map((lezione, index) => {
        const parts = lezione.split(';');
        const giorno = parts[0]?.trim() || '';
        const sala = parts[1]?.trim() || '';
        const orario = parts[2]?.trim() || '';
        return (
          <li key={index}>
            {giorno} - {sala} - {orario}
          </li>
        );
      })}
    </Box>
  );
};

const corsiColumns = [
  { key: 'nomeCorso', label: 'Nome Corso', width: '20%' },
  { key: 'categoria', label: 'Categoria', width: '15%' },
  { key: 'lezioni', label: 'Lezioni', format: formatLezioni, width: '35%' },
  { key: 'prezzo', label: 'Prezzo', format: formatPrice, width: '10%' },
  { key: 'oreSettimanali', label: 'Ore Sett.', width: '10%' }
];

const corsiExcelColumns = [
  { key: 'nomeCorso', label: 'Nome Corso' },
  { key: 'categoria', label: 'Categoria' },
  {
    key: 'lezioni',
    label: 'Lezioni',
    format: (lezioni: string[]) => {
      if (!lezioni || lezioni.length === 0) return '';
      return lezioni
        .map((lezione) => {
          const parts = lezione.split(';');
          const giorno = parts[0]?.trim() || '';
          const sala = parts[1]?.trim() || '';
          const orario = parts[2]?.trim() || '';
          return `${giorno} - ${sala} - ${orario}`;
        })
        .join('\n');
    }
  },
  { key: 'prezzo', label: 'Prezzo', format: formatPrice },
  { key: 'oreSettimanali', label: 'Ore Sett.' }
];

const GestioneCorsi: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const timeSlots = useTimeSlots();
  const { errors: corsoErrors, validate: validateCorso, clearAllErrors: clearCorsoErrors, setError } = useFormValidation();
  
  const { data: sale } = useSupabaseData<Sala>('Sale', { userName: profile?.userName || 'Unknown' });
  const { data: categorie } = useSupabaseData<CategoriaCorso>('CategorieCorsi', { userName: profile?.userName || 'Unknown' });
  const { data: soci, update: updateSocio } = useSupabaseData<Socio>('Soci', { userName: profile?.userName || 'Unknown' });
  const { data: insegnanti, update: updateInsegnante } = useSupabaseData<Insegnante>('Insegnanti', { userName: profile?.userName || 'Unknown' });
  const { data: corsiData, create: createCorso, update: updateCorso, remove: removeCorso } = useSupabaseData<Corso>('Corsi', { userName: profile?.userName || 'Unknown' });

  // Ordina i corsi per categoria e poi per nome come default
  const corsi = useMemo(() => {
    return [...corsiData].sort((a, b) => {
      const categoriaCompare = a.categoria.localeCompare(b.categoria);
      if (categoriaCompare !== 0) return categoriaCompare;
      return a.nomeCorso.localeCompare(b.nomeCorso);
    });
  }, [corsiData]);

  
  const [openCorsoDialog, setOpenCorsoDialog] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [corsoToDelete, setCorsoToDelete] = useState<string | null>(null);
  const [editingCorso, setEditingCorso] = useState<Corso | null>(null);
  const [openConfirmModify, setOpenConfirmModify] = useState(false);
  const [affectedSoci, setAffectedSoci] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(false);
  const [affectedInsegnanti, setAffectedInsegnanti] = useState<Insegnante[]>([]);
  const [openSuccess, setOpenSuccess] = useState(false);
  
  const [nomeCorso, setNomeCorso] = useState('');
  const [prezzo, setPrezzo] = useState<string>('');
  const [categoria, setCategoria] = useState('');
  const [oreSettimanali, setOreSettimanali] = useState<string>('');
  
  // Stato per le lezioni
  const [giornoSettimana, setGiornoSettimana] = useState('');
  const [salaSelezionata, setSalaSelezionata] = useState('');
  const [oraInizio, setOraInizio] = useState('');
  const [oraFine, setOraFine] = useState('');
  const [lezioni, setLezioni] = useState<{giorno: string, sala: string, orario: string}[]>([]);

  const parseLezioni = useCallback((lezioniArray: string[]) => {
    if (!lezioniArray || lezioniArray.length === 0) {
      setLezioni([]);
      return;
    }
    const parsed = lezioniArray.map(item => {
      const parts = item.split(';');
      return { 
        giorno: parts[0]?.trim() || '', 
        sala: parts[1]?.trim() || '', 
        orario: parts[2]?.trim() || '' 
      };
    });
    setLezioni(parsed);
  }, []);

  const serializeLezioni = useCallback((lezioniArray: {giorno: string, sala: string, orario: string}[]) => {
    return lezioniArray.map(l => `${l.giorno};${l.sala};${l.orario}`);
  }, []);

  const handleOpenCorsoDialog = useCallback((corso?: Corso, isCopy: boolean = false) => {
    if (corso) {
      if (isCopy) {
        setEditingCorso(null);
      } else {
        setEditingCorso(corso);
      }
      setNomeCorso(corso.nomeCorso);
      setPrezzo(corso.prezzo != null ? String(corso.prezzo) : '');
      setCategoria(corso.categoria);
      setOreSettimanali(corso.oreSettimanali != null ? String(corso.oreSettimanali) : '');
      parseLezioni(corso.lezioni || []);
    } else {
      setEditingCorso(null);
      setNomeCorso('');
      setPrezzo('');
      setCategoria('');
      setOreSettimanali('');
      setLezioni([]);
    }
    setGiornoSettimana('');
    setSalaSelezionata('');
    setOraInizio('');
    setOraFine('');
    clearCorsoErrors();
    setOpenCorsoDialog(true);
  }, [clearCorsoErrors, parseLezioni]);

  const handleCloseCorsoDialog = useCallback(() => {
    setOpenCorsoDialog(false);
    setEditingCorso(null);
    setNomeCorso('');
    setPrezzo('');
    setCategoria('');
    setOreSettimanali('');
    setLezioni([]);
    setGiornoSettimana('');
    setSalaSelezionata('');
    setOraInizio('');
    setOraFine('');
    clearCorsoErrors();
  }, [clearCorsoErrors]);

  const handleAggiungiLezione = useCallback(() => {
    if (!giornoSettimana || !salaSelezionata || !oraInizio || !oraFine) {
      return;
    }
    
    if (!validateTimeRange(oraInizio, oraFine)) {
      setError('oraFine', ERROR_MESSAGES.INVALID_TIME_RANGE);
      return;
    }
    
    const orario = createOrario(oraInizio, oraFine);
    const nuovaLezione = { giorno: giornoSettimana, sala: salaSelezionata, orario };
    
    setLezioni(prev => [...prev, nuovaLezione]);
    setGiornoSettimana('');
    setSalaSelezionata('');
    setOraInizio('');
    setOraFine('');
    clearCorsoErrors();
  }, [giornoSettimana, salaSelezionata, oraInizio, oraFine, setError, clearCorsoErrors]);

  const handleRimuoviLezione = useCallback((index: number) => {
    setLezioni(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveCorso = async () => {
    setLoading(true);
    clearCorsoErrors();
    
    // Validazione base
    const isValid = validateCorso(
      { nomeCorso, categoria },
      {
        nomeCorso: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('nome corso') },
        categoria: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('categoria') }
      }
    );
    
    if (!isValid) {
      setLoading(false);
      return;
    }

    // Se stiamo modificando e il nome del corso è cambiato, controlla i soci associati
    let blockModify = false;
    if (editingCorso && editingCorso.nomeCorso !== nomeCorso) {
      const associatedSoci = soci.filter(socio => 
        socio.base === editingCorso.nomeCorso || 
        socio.corsi?.includes(editingCorso.nomeCorso)
      );
      const associatedInsegnanti = insegnanti.filter(ins =>
        ins.discipline?.some(disc => disc.split(';')[0]?.trim() === editingCorso.nomeCorso)
      );
      if (associatedSoci.length > 0 || associatedInsegnanti.length > 0) {
        setAffectedSoci(associatedSoci);
        setAffectedInsegnanti(associatedInsegnanti);
        setOpenConfirmModify(true);
        blockModify = true;
      }
    }
    if (blockModify) return;

    await saveCorso();
  };

  const saveCorso = async () => {
    const corsoData = {
      nomeCorso,
      prezzo: Number(prezzo) || 0,
      categoria,
      oreSettimanali: Number(oreSettimanali) || 0,
      lezioni: serializeLezioni(lezioni)
    };

    const result = editingCorso
      ? await updateCorso(editingCorso.id, corsoData)
      : await createCorso(corsoData);
    
    if (!result.success && result.error?.code === '23505') {
      validateCorso({ nomeCorso }, {
        nomeCorso: { 
          required: true, 
          message: 'Nome corso già presente',
          customValidation: () => false
        }
      });
      setLoading(false);
      return;
    }
    
    if (result.success) {
      const tipoOperazione = editingCorso ? 'Modifica' : 'Creazione';
      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione,
        lista: 'Corsi',
        elemento: nomeCorso
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log:', error);
      });
      handleCloseCorsoDialog();
      setOpenSuccess(true);
    }
    setLoading(false);
  };

  const handleConfirmModify = useCallback(async () => {
    setOpenConfirmModify(false);
    
    // Prima salva il corso
    const corsoData = {
      nomeCorso,
      prezzo: Number(prezzo) || 0,
      categoria,
      oreSettimanali: Number(oreSettimanali) || 0,
      lezioni: serializeLezioni(lezioni)
    };
    const result = await updateCorso(editingCorso!.id, corsoData);
    
    if (result.success && editingCorso) {
      // Aggiorna i soci in batch
      await Promise.all(
        affectedSoci.map(async (socio) => {
          const updates: Partial<Socio> = {};
          if (socio.base === editingCorso.nomeCorso) {
            updates.base = nomeCorso;
          }
          if (socio.corsi?.includes(editingCorso.nomeCorso)) {
            const corsiArray = socio.corsi.split(';').map(c => c.trim());
            const nuoviCorsi = corsiArray.map(c => c === editingCorso.nomeCorso ? nomeCorso : c);
            updates.corsi = nuoviCorsi.join(';');
          }
          if (Object.keys(updates).length > 0) {
            return updateSocio(socio.id, { ...socio, ...updates });
          }
        })
      );
      // Aggiorna insegnanti in batch
      await Promise.all(
        affectedInsegnanti.map(async (ins) => {
          const nuoveDiscipline = ins.discipline.map(disc => {
            const parts = disc.split(';');
            if (parts[0]?.trim() === editingCorso.nomeCorso) {
              parts[0] = nomeCorso;
            }
            return parts.join(';');
          });
          return updateInsegnante(ins.id, { ...ins, discipline: nuoveDiscipline });
        })
      );
    }
    
    if (result.success) {
      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione: 'Modifica',
        lista: 'Corsi',
        elemento: nomeCorso
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log:', error);
      });
      handleCloseCorsoDialog();
      setOpenSuccess(true);
    }
    setLoading(false);
    setAffectedSoci([]);
  }, [nomeCorso, prezzo, categoria, oreSettimanali, lezioni, editingCorso, updateCorso, affectedSoci, updateSocio, serializeLezioni, handleCloseCorsoDialog]);

  const handleDeleteCorso = useCallback((id: string) => {
    const corsoToRemove = corsi.find((c: Corso) => c.id === id);
    if (!corsoToRemove) return;
    
    const associatedSoci = soci.filter(socio => 
      socio.base === corsoToRemove.nomeCorso || 
      socio.corsi?.includes(corsoToRemove.nomeCorso)
    );
    const associatedInsegnanti = insegnanti.filter(ins =>
      ins.discipline?.some(disc => disc.split(';')[0]?.trim() === corsoToRemove.nomeCorso)
    );
    setAffectedSoci(associatedSoci);
    setAffectedInsegnanti(associatedInsegnanti);
    setCorsoToDelete(id);
    setOpenConfirmDelete(true);
  }, [corsi, soci]);

  const handleConfirmDelete = useCallback(async () => {
    if (corsoToDelete) {
      setLoading(true);
      const corsoToRemove = corsi.find((c: Corso) => c.id === corsoToDelete);
      
      // Aggiorna i soci rimuovendo il corso
      if (corsoToRemove) {
        await Promise.all(
          affectedSoci.map(async (socio) => {
            const updates: Partial<Socio> = {};
            if (socio.base === corsoToRemove.nomeCorso) {
              updates.base = '';
            }
            if (socio.corsi?.includes(corsoToRemove.nomeCorso)) {
              const corsiArray = socio.corsi.split(';').map(c => c.trim());
              const nuoviCorsi = corsiArray.filter(c => c !== corsoToRemove.nomeCorso);
              updates.corsi = nuoviCorsi.join(';');
            }
            if (Object.keys(updates).length > 0) {
              return updateSocio(socio.id, { ...socio, ...updates });
            }
          })
        );
        // Aggiorna insegnanti rimuovendo il corso dalle discipline
        await Promise.all(
          affectedInsegnanti.map(async (ins) => {
            const nuoveDiscipline = ins.discipline.filter(disc => disc.split(';')[0]?.trim() !== corsoToRemove.nomeCorso);
            return updateInsegnante(ins.id, { ...ins, discipline: nuoveDiscipline });
          })
        );
      }
      
      const deleteResult = await removeCorso(corsoToDelete);
      if (deleteResult.success && corsoToRemove) {
        logOperation({
          utente: profile?.userName || 'Unknown',
          tipoOperazione: 'Eliminazione',
          lista: 'Corsi',
          elemento: corsoToRemove.nomeCorso
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Errore durante la scrittura del log:', error);
        });
      }
      setLoading(false);
      setOpenConfirmDelete(false);
      setCorsoToDelete(null);
      setAffectedSoci([]);
    }
  }, [corsoToDelete, corsi, affectedSoci, updateSocio, removeCorso]);

  const handleCancelDelete = useCallback(() => {
    setOpenConfirmDelete(false);
    setCorsoToDelete(null);
  }, []);

  const renderNomeCorsoCell = useCallback((row: Corso, col: any) => {
    if (col.key !== 'nomeCorso') return undefined;
    const categoria = categorie.find(c => c.categoria === row.categoria);
    const colore = categoria?.colore || '#1976d2';
    return (
      <Box
        sx={{
          px: 1,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: colore + '40',
          display: 'inline-block'
        }}
      >
        {row.nomeCorso}
      </Box>
    );
  }, [categorie]);

  const corsiTable = useMemo(() => (
    <DataTable
      title="Corsi"
      columns={corsiColumns}
      data={corsi}
      onAdd={() => handleOpenCorsoDialog()}
      onEdit={handleOpenCorsoDialog}
      onDelete={handleDeleteCorso}
      emptyMessage="Nessun corso presente"
      renderCell={renderNomeCorsoCell}
    />
  ), [corsi, corsiColumns, handleOpenCorsoDialog, handleDeleteCorso, renderNomeCorsoCell]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/orario-anno-accademico')}
          sx={{ color: 'primary.main' }}
          title="Torna a Orario Anno Accademico"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Gestione Corsi
        </Typography>
        {profile?.role !== 'reader' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            sx={{ fontWeight: 600, textTransform: 'none', ml: 'auto' }}
            onClick={() => exportCorsiExcel(corsi, corsiExcelColumns)}
          >
            Export Excel
          </Button>
        )}
      </Box>
      {corsiTable}

      <SuccessDialog
        open={openSuccess}
        onClose={() => setOpenSuccess(false)}
      />

      <Dialog open={openCorsoDialog} onClose={handleCloseCorsoDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingCorso ? 'Modifica Corso' : 'Nuovo Corso'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Nome Corso"
              fullWidth
              value={nomeCorso}
              onChange={(e) => setNomeCorso(e.target.value)}
              error={!!corsoErrors.nomeCorso}
              helperText={corsoErrors.nomeCorso}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                select
                label="Categoria"
                fullWidth
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                error={!!corsoErrors.categoria}
                helperText={corsoErrors.categoria}
              >
                {categorie.map((cat) => (
                  <MenuItem key={cat.id} value={cat.categoria}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        width: 18,
                        height: 18,
                        borderRadius: '4px',
                        backgroundColor: cat.colore,
                        border: '1px solid #ccc',
                        mr: 1,
                        verticalAlign: 'middle'
                      }}
                    />
                    {cat.categoria}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Prezzo€"
                type="number"
                fullWidth
                value={prezzo}
                onChange={(e) => setPrezzo(e.target.value)}
              />
              <TextField
                label="Ore Settimanali"
                type="number"
                fullWidth
                value={oreSettimanali}
                inputProps={{ step: 0.5 }}
                onChange={(e) => setOreSettimanali(e.target.value)}
              />
            </Box>
            
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 1, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>
              Aggiungi Lezione
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    select
                    label="Giorno Settimana"
                    fullWidth
                    value={giornoSettimana}
                    onChange={(e) => setGiornoSettimana(e.target.value)}
                    error={!!corsoErrors.giornoSettimana}
                    helperText={corsoErrors.giornoSettimana}
                  >
                    {GIORNI_SETTIMANA.map((giorno) => (
                      <MenuItem key={giorno} value={giorno}>{giorno}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Sala"
                    fullWidth
                    value={salaSelezionata}
                    onChange={(e) => setSalaSelezionata(e.target.value)}
                    error={!!corsoErrors.sala}
                    helperText={corsoErrors.sala}
                  >
                    {sale.map((sala) => (
                      <MenuItem key={sala.id} value={sala.nomeSala}>{sala.nomeSala}</MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    select
                    label="Ora Inizio"
                    fullWidth
                    value={oraInizio}
                    onChange={(e) => setOraInizio(e.target.value)}
                    error={!!corsoErrors.oraInizio}
                    helperText={corsoErrors.oraInizio}
                  >
                    {timeSlots.map((time) => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Ora Fine"
                    fullWidth
                    value={oraFine}
                    onChange={(e) => setOraFine(e.target.value)}
                    error={!!corsoErrors.oraFine}
                    helperText={corsoErrors.oraFine}
                  >
                    {timeSlots.map((time) => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </TextField>
                  <Button 
                    variant="outlined" 
                    onClick={handleAggiungiLezione}
                    sx={{ minWidth: 120 }}
                  >
                    Aggiungi
                  </Button>
                </Box>
              </Stack>
            </Box>

            {lezioni.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 1, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>
                  Lezioni inserite
                </Typography>
                <Stack spacing={1}>
                  {lezioni.map((lezione, index) => (
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
                        {lezione.giorno} - {lezione.sala} - {lezione.orario}
                      </Typography>
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => handleRimuoviLezione(index)}
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
          <Button onClick={handleCloseCorsoDialog}>Annulla</Button>
          <Button onClick={handleSaveCorso} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      <WarningDialog
        open={openConfirmDelete}
        title={affectedSoci.length > 0 || affectedInsegnanti.length > 0 ? 'ATTENZIONE!' : 'Conferma eliminazione'}
        message={
          affectedSoci.length > 0 || affectedInsegnanti.length > 0
            ? 'Impossibile eliminare il corso perché associato ai seguenti soci/insegnanti:'
            : 'Sei sicuro di voler eliminare questo corso?'
        }
        items={
          affectedSoci.length > 0 || affectedInsegnanti.length > 0
            ? [
                ...affectedSoci.map(socio => ({ id: socio.id, label: `${socio.cognome} ${socio.nome}` })),
                ...affectedInsegnanti.map(ins => ({ id: ins.id, label: `${ins.cognome} ${ins.nome}` }))
              ]
            : undefined
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Elimina"
        confirmColor="error"
        hideConfirm={affectedSoci.length > 0 || affectedInsegnanti.length > 0}
      />

      <WarningDialog
        open={openConfirmModify}
        title="ATTENZIONE!"
        message="Ci sono dei soci/insegnanti associati a questo Corso. Se procedi la modifica verrà applicata anche a loro:"
        items={[
          ...affectedSoci.map(socio => ({ id: socio.id, label: `${socio.cognome} ${socio.nome}` })),
          ...affectedInsegnanti.map(ins => ({ id: ins.id, label: `${ins.cognome} ${ins.nome}` }))
        ]}
        onConfirm={handleConfirmModify}
        onCancel={() => setOpenConfirmModify(false)}
        confirmText="Procedi"
      />
    </Container>
  );
};

export default GestioneCorsi;
