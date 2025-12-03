import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import WarningDialog from '../components/WarningDialog';
import { Sala, Corso } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { ERROR_MESSAGES } from '../constants';

const GestioneSale: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { errors: salaErrors, validate: validateSala, clearAllErrors: clearSalaErrors } = useFormValidation();
  
  const { 
    data: sale, 
    create: createSala, 
    update: updateSala, 
    remove: removeSala 
  } = useSupabaseData<Sala>('Sale', { userName: profile?.userName || 'Unknown' });
  
  const { data: corsi, update: updateCorso } = useSupabaseData<Corso>('Corsi', { userName: profile?.userName || 'Unknown' });
  
  const [openSalaDialog, setOpenSalaDialog] = useState(false);
  const [editingSala, setEditingSala] = useState<Sala | null>(null);
  const [nomeSala, setNomeSala] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [affectedCorsi, setAffectedCorsi] = useState<Corso[]>([]);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [salaToDelete, setSalaToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenSalaDialog = useCallback((sala?: Sala) => {
    if (sala) {
      setEditingSala(sala);
      setNomeSala(sala.nomeSala);
    } else {
      setEditingSala(null);
      setNomeSala('');
    }
    clearSalaErrors();
    setOpenSalaDialog(true);
  }, [clearSalaErrors]);

  const handleCloseSalaDialog = useCallback(() => {
    setOpenSalaDialog(false);
    setEditingSala(null);
    setNomeSala('');
    clearSalaErrors();
  }, [clearSalaErrors]);

  const handleSaveSala = async () => {
    setLoading(true);
    const isValid = validateSala(
      { nomeSala },
      {
        nomeSala: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('nome sala') }
      }
    );
    
    if (!isValid) {
      setLoading(false);
      return;
    }

    // Se stiamo modificando e il nome della sala è cambiato, controlla i corsi associati
    if (editingSala && editingSala.nomeSala !== nomeSala) {
      const associatedCorsi = corsi.filter(corso => 
        corso.lezioni?.some(lezione => {
          const parts = lezione.split(';');
          const sala = parts[1]?.trim() || '';
          return sala === editingSala.nomeSala;
        })
      );
      
      if (associatedCorsi.length > 0) {
        setAffectedCorsi(associatedCorsi);
        setOpenConfirmDialog(true);
        setLoading(false);
        return;
      }
    }

    await saveSala();
  };

  const saveSala = useCallback(async () => {
    const salaData = { nomeSala };

    const result = editingSala
      ? await updateSala(editingSala.id, salaData)
      : await createSala(salaData);
    
    if (!result.success && result.error?.code === '23505') {
      validateSala({ nomeSala }, {
        nomeSala: { 
          required: true, 
          message: 'Nome sala già presente',
          customValidation: () => false
        }
      });
      setLoading(false);
      return;
    }
    
    if (result.success) {
      handleCloseSalaDialog();
    }
    setLoading(false);
  }, [nomeSala, editingSala, updateSala, createSala, validateSala, handleCloseSalaDialog]);

  const handleConfirmProceed = useCallback(async () => {
    setOpenConfirmDialog(false);
    setLoading(true);
    
    // Prima salva la sala
    const salaData = { nomeSala };
    const result = editingSala
      ? await updateSala(editingSala.id, salaData)
      : await createSala(salaData);
    
    if (result.success && editingSala) {
      // Aggiorna i corsi in batch usando Promise.all
      await Promise.all(
        affectedCorsi.map(async (corso) => {
          const nuoveLezioni = corso.lezioni.map(lezione => {
            const parts = lezione.split(';');
            const giorno = parts[0]?.trim() || '';
            const sala = parts[1]?.trim() || '';
            const orario = parts[2]?.trim() || '';
            
            if (sala === editingSala.nomeSala) {
              return `${giorno};${nomeSala};${orario}`;
            }
            return lezione;
          });
          
          return updateCorso(corso.id, { ...corso, lezioni: nuoveLezioni });
        })
      );
    }
    
    if (result.success) {
      handleCloseSalaDialog();
    }
    setAffectedCorsi([]);
    setLoading(false);
  }, [nomeSala, editingSala, updateSala, createSala, affectedCorsi, updateCorso, handleCloseSalaDialog]);

  const handleConfirmCancel = useCallback(() => {
    setOpenConfirmDialog(false);
  }, []);

  const handleDeleteSala = async (id: string) => {
    const salaToRemove = sale.find(s => s.id === id);
    if (!salaToRemove) return;
    
    const associatedCorsi = corsi.filter(corso => 
      corso.lezioni?.some(lezione => {
        const parts = lezione.split(';');
        const sala = parts[1]?.trim() || '';
        return sala === salaToRemove.nomeSala;
      })
    );
    setAffectedCorsi(associatedCorsi);
    setSalaToDelete(id);
    setOpenDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (salaToDelete) {
      setLoading(true);
      const salaToRemove = sale.find(s => s.id === salaToDelete);
      
      // Aggiorna i corsi in batch usando Promise.all
      if (salaToRemove) {
        await Promise.all(
          affectedCorsi.map(async (corso) => {
            const nuoveLezioni = corso.lezioni.filter(lezione => {
              const parts = lezione.split(';');
              const sala = parts[1]?.trim() || '';
              return sala !== salaToRemove.nomeSala;
            });
            
            return updateCorso(corso.id, { ...corso, lezioni: nuoveLezioni });
          })
        );
      }
      
      await removeSala(salaToDelete);
      setOpenDeleteConfirmDialog(false);
      setSalaToDelete(null);
      setAffectedCorsi([]);
      setLoading(false);
    }
  }, [salaToDelete, sale, affectedCorsi, updateCorso, removeSala]);

  const handleCancelDelete = useCallback(() => {
    setOpenDeleteConfirmDialog(false);
    setSalaToDelete(null);
    setAffectedCorsi([]);
  }, []);

  const saleColumns = [
    { key: 'nomeSala', label: 'Sala', width: '100%' }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/orario-anno-accademico')}
          sx={{ color: 'primary.main' }}
          title="Torna a Orario Anno Accademico"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Gestione Sale
        </Typography>
      </Box>

      <DataTable
        title="Sale"
        columns={saleColumns}
        data={sale}
        onAdd={() => handleOpenSalaDialog()}
        onEdit={handleOpenSalaDialog}
        onDelete={handleDeleteSala}
        emptyMessage="Nessuna sala presente"
      />

      <Dialog open={openSalaDialog} onClose={handleCloseSalaDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSala ? 'Modifica Sala' : 'Nuova Sala'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome Sala"
            fullWidth
            value={nomeSala}
            onChange={(e) => setNomeSala(e.target.value)}
            error={!!salaErrors.nomeSala}
            helperText={salaErrors.nomeSala}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSalaDialog}>Annulla</Button>
          <Button onClick={handleSaveSala} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      <WarningDialog
        open={openConfirmDialog}
        title="ATTENZIONE!"
        message="Ci sono dei corsi associati a questa Sala. Se procedi la modifica verrà applicata anche ai corsi:"
        items={affectedCorsi.map(corso => ({ id: corso.id, label: corso.nomeCorso }))}
        onConfirm={handleConfirmProceed}
        onCancel={handleConfirmCancel}
        confirmText="Procedi"
      />

      <WarningDialog
        open={openDeleteConfirmDialog}
        title={affectedCorsi.length > 0 ? 'ATTENZIONE!' : 'Conferma eliminazione'}
        message={
          affectedCorsi.length > 0
            ? 'Impossibile eliminare la sala perché associata ai seguenti corsi:'
            : 'Sei sicuro di voler eliminare questa sala?'
        }
        items={affectedCorsi.length > 0 ? affectedCorsi.map(corso => ({ id: corso.id, label: corso.nomeCorso })) : undefined}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Elimina"
        confirmColor="error"
        hideConfirm={affectedCorsi.length > 0}
      />
    </Container>
  );
};

export default GestioneSale;
