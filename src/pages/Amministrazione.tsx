import React, { useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import WarningDialog from '../components/WarningDialog';
import { UserProfile, InfoSito, TipoIscrizione, ImportoPreventivo, Log } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { ERROR_MESSAGES } from '../constants';
import { MenuItem } from '@mui/material';

const Amministrazione: React.FC = () => {
    const { removeAll: removeAllFatture } = useSupabaseData('Fatture');
    const { removeAll: removeAllPagamenti } = useSupabaseData('PagamentiInsegnanti');
    const [openConfirmFatture, setOpenConfirmFatture] = useState(false);
    const [openConfirmPagamenti, setOpenConfirmPagamenti] = useState(false);
    const [openConfirmLogs, setOpenConfirmLogs] = useState(false);
    const handleSvuotaFatture = useCallback(() => {
      setOpenConfirmFatture(true);
    }, []);
    const handleSvuotaPagamenti = useCallback(() => {
      setOpenConfirmPagamenti(true);
    }, []);
    const handleSvuotaLogs = useCallback(() => {
      setOpenConfirmLogs(true);
    }, []);
    const handleConfirmSvuotaFatture = useCallback(async () => {
      setLoading(true);
      if (removeAllFatture) await removeAllFatture();
      setOpenConfirmFatture(false);
      setLoading(false);
    }, [removeAllFatture]);
    const handleConfirmSvuotaPagamenti = useCallback(async () => {
      setLoading(true);
      if (removeAllPagamenti) await removeAllPagamenti();
      setOpenConfirmPagamenti(false);
      setLoading(false);
    }, [removeAllPagamenti]);
    const handleCancelSvuotaFatture = useCallback(() => {
      setOpenConfirmFatture(false);
    }, []);
    const handleCancelSvuotaPagamenti = useCallback(() => {
      setOpenConfirmPagamenti(false);
    }, []);
    const handleCancelSvuotaLogs = useCallback(() => {
      setOpenConfirmLogs(false);
    }, []);
  const { profile } = useAuth();
  const { data: users, create: createUser, update: updateUser, remove: removeUser } = useSupabaseData<UserProfile>('Users', { userName: profile?.userName || 'Unknown' });
  const { data: infoSito, create: createInfoSito, update: updateInfoSito, remove: removeInfoSito } = useSupabaseData<InfoSito>('InfoSito', { userName: profile?.userName || 'Unknown' });
  const { data: tipiIscrizione, create: createTipoIscrizione, update: updateTipoIscrizione, remove: removeTipoIscrizione } = useSupabaseData<TipoIscrizione>('TipoIscrizione', { userName: profile?.userName || 'Unknown' });
  const { data: importiPreventivo, create: createImportoPreventivo, update: updateImportoPreventivo, remove: removeImportoPreventivo } = useSupabaseData<ImportoPreventivo>('ImportiPreventivo', { userName: profile?.userName || 'Unknown' });
  const { data: logs, removeAll: removeAllLogs } = useSupabaseData<Log>('Logs', { userName: profile?.userName || 'Unknown' });
  const { errors, validate, clearAllErrors } = useFormValidation();

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [currentSection, setCurrentSection] = useState<'users' | 'infoSito' | 'tipoIscrizione' | 'importiPreventivo'>('users');
  const [loading, setLoading] = useState(false);

  const handleConfirmSvuotaLogs = useCallback(async () => {
    setLoading(true);
    if (removeAllLogs) await removeAllLogs();
    setOpenConfirmLogs(false);
    setLoading(false);
  }, [removeAllLogs]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) setCurrentSection('users');
    if (newValue === 2) setCurrentSection('infoSito');
    if (newValue === 3) setCurrentSection('tipoIscrizione');
    if (newValue === 4) setCurrentSection('importiPreventivo');
  }, []);

  const handleOpenDialog = useCallback((item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm(item);
    } else {
      setEditingItem(null);
      setForm({});
    }
    clearAllErrors();
    setOpenDialog(true);
  }, [clearAllErrors]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingItem(null);
    setForm({});
    clearAllErrors();
  }, [clearAllErrors]);

  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    clearAllErrors();
    
    let isValid = false;
    let result;

    if (currentSection === 'users') {
      isValid = validate(form, {
        userName: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('username') },
        password: { required: !editingItem, message: ERROR_MESSAGES.REQUIRED_FIELD('password') },
        role: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('role') },
      });
      if (!isValid) return;
      
      if (editingItem) {
        result = await updateUser(editingItem.id, form);
      } else {
        result = await createUser(form);
      }
    } else if (currentSection === 'infoSito') {
      isValid = validate(form, {
        campo: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('campo') },
        valore: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('valore') },
      });
      if (!isValid) {
        setLoading(false);
        return;
      }
      
      if (editingItem) {
        result = await updateInfoSito(editingItem.id, form);
      } else {
        result = await createInfoSito(form);
      }
    } else if (currentSection === 'tipoIscrizione') {
      isValid = validate(form, {
        tipo: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('tipo') },
        value: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('value') },
      });
      if (!isValid) {
        setLoading(false);
        return;
      }

      if (editingItem) {
        result = await updateTipoIscrizione(editingItem.id, form);
      } else {
        result = await createTipoIscrizione(form);
      }
    } else if (currentSection === 'importiPreventivo') {
      isValid = validate(form, {
        descrizione: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('descrizione') },
        valore: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('valore') },
      });
      if (!isValid) {
        setLoading(false);
        return;
      }

      if (editingItem) {
        result = await updateImportoPreventivo(editingItem.id, form);
      } else {
        result = await createImportoPreventivo(form);
      }
    }

    if (result?.success) {
      handleCloseDialog();
    }
    setLoading(false);
  };

  const handleDelete = useCallback(async (id: string) => {
    setItemToDelete(id);
    setOpenConfirmDelete(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setLoading(true);
    if (currentSection === 'users') {
      await removeUser(itemToDelete);
    } else if (currentSection === 'infoSito') {
      await removeInfoSito(itemToDelete);
    } else if (currentSection === 'tipoIscrizione') {
      await removeTipoIscrizione(itemToDelete);
    } else if (currentSection === 'importiPreventivo') {
      await removeImportoPreventivo(itemToDelete);
    }

    setOpenConfirmDelete(false);
    setItemToDelete(null);
    setLoading(false);
  }, [itemToDelete, currentSection, removeUser, removeInfoSito, removeTipoIscrizione, removeImportoPreventivo]);

  const handleCancelDelete = useCallback(() => {
    setOpenConfirmDelete(false);
    setItemToDelete(null);
  }, []);

  const usersColumns = [
    { key: 'userName', label: 'Username', width: '40%' },
    { key: 'password', label: 'Password', width: '30%' },
    { key: 'role', label: 'Role', width: '30%' },
  ];


  const infoSitoColumns = [
    { key: 'campo', label: 'Campo', width: '40%' },
    { key: 'valore', label: 'Valore', width: '40%' },
  ];

  const tipoIscrizioneColumns = [
    { key: 'tipo', label: 'Tipo', width: '50%' },
    { key: 'value', label: 'Valore', width: '50%' },
  ];

  const importiPreventivoColumns = [
    { key: 'descrizione', label: 'Descrizione', width: '50%' },
    { key: 'valore', label: 'Valore', width: '50%' },
  ];

  const logsColumns = [
    { key: 'id', label: 'ID', width: '10%' },
    { key: 'utente', label: 'Utente', width: '15%' },
    { key: 'dataOperazione', label: 'Data Operazione', width: '20%' },
    { key: 'tipoOperazione', label: 'Tipo Operazione', width: '20%' },
    { key: 'lista', label: 'Lista', width: '15%' },
    { key: 'elemento', label: 'Elemento', width: '20%' },
  ];

  if (profile?.role !== 'admin') {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography variant="h5" color="error">
          Accesso negato. Solo gli amministratori possono accedere a questa pagina.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Amministrazione
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'flex-end' }}>
        <Button variant="contained" color="error" onClick={handleSvuotaFatture} sx={{ fontWeight: 600 }}>
          Svuota Fatture Soci
        </Button>
        <Button variant="contained" color="error" onClick={handleSvuotaPagamenti} sx={{ fontWeight: 600 }}>
          Svuota Pagamenti Insegnanti
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Logs" />
          <Tab label="Utenti" />
          <Tab label="Info Sito" />
          <Tab label="Tipo Iscrizione" />
          <Tab label="Importi Preventivo" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">
              Numero elementi: {logs?.length ?? 0}
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={handleSvuotaLogs}
              sx={{ fontWeight: 600 }}
            >
              Svuota Logs
            </Button>
          </Box>
          <DataTable
            title="Logs"
            columns={logsColumns}
            data={logs}
            emptyMessage="Nessun log presente"
          />
        </>
      )}

      {tabValue === 1 && (
        <DataTable
          title="Utenti"
          columns={usersColumns}
          data={users}
          onAdd={() => handleOpenDialog()}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          emptyMessage="Nessun utente presente"
        />
      )}

      {tabValue === 2 && (
        <DataTable
          title="Info Sito"
          columns={infoSitoColumns}
          data={infoSito}
          onAdd={() => handleOpenDialog()}
          onEdit={handleOpenDialog}
          emptyMessage="Nessuna info presente"
        />
      )}

      {tabValue === 3 && (
        <DataTable
          title="Tipo Iscrizione"
          columns={tipoIscrizioneColumns}
          data={tipiIscrizione}
          onAdd={() => handleOpenDialog()}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          emptyMessage="Nessun tipo iscrizione presente"
        />
      )}

      {tabValue === 4 && (
        <DataTable
          title="Importi Preventivo"
          columns={importiPreventivoColumns}
          data={importiPreventivo}
          onAdd={() => handleOpenDialog()}
          onEdit={handleOpenDialog}
          emptyMessage="Nessun importo presente"
        />
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? `Modifica ${currentSection === 'users' ? 'Utente' : currentSection === 'infoSito' ? 'Info' : currentSection === 'tipoIscrizione' ? 'Tipo Iscrizione' : 'Importi Preventivo'}` : `Nuovo ${currentSection === 'users' ? 'Utente' : currentSection === 'infoSito' ? 'Info' : currentSection === 'tipoIscrizione' ? 'Tipo Iscrizione' : 'Importi Preventivo'}`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {currentSection === 'users' && (
              <>
                <TextField
                  label="Username"
                  fullWidth
                  value={form.userName || ''}
                  onChange={(e) => handleChange('userName', e.target.value)}
                  error={!!errors.userName}
                  helperText={errors.userName}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  value={form.password || ''}
                  onChange={(e) => handleChange('password', e.target.value)}
                  error={!!errors.password}
                  helperText={errors.password || (editingItem ? 'Lascia vuoto per non modificare' : '')}
                />
                <TextField
                  select
                  label="Ruolo"
                  fullWidth
                  value={form.role || ''}
                  onChange={(e) => handleChange('role', e.target.value)}
                  error={!!errors.role}
                  helperText={errors.role}
                >
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="contribute">contribute</MenuItem>
                  <MenuItem value="reader">reader</MenuItem>
                </TextField>
              </>
            )}

            {currentSection === 'infoSito' && (
              <>
                <TextField
                  label="Campo"
                  fullWidth
                  value={form.campo || ''}
                  onChange={(e) => handleChange('campo', e.target.value)}
                  error={!!errors.campo}
                  helperText={errors.campo}
                />
                <TextField
                  label="Valore"
                  fullWidth
                  value={form.valore || ''}
                  onChange={(e) => handleChange('valore', e.target.value)}
                  error={!!errors.valore}
                  helperText={errors.valore}
                />
              </>
            )}
            {currentSection === 'tipoIscrizione' && (
              <>
                <TextField
                  label="Tipo"
                  fullWidth
                  value={form.tipo || ''}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  error={!!errors.tipo}
                  helperText={errors.tipo}
                />
                <TextField
                  label="Valore"
                  fullWidth
                  value={form.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  error={!!errors.value}
                  helperText={errors.value}
                />
              </>
            )}

            {currentSection === 'importiPreventivo' && (
              <>
                <TextField
                  label="Descrizione"
                  fullWidth
                  value={form.descrizione || ''}
                  onChange={(e) => handleChange('descrizione', e.target.value)}
                  error={!!errors.descrizione}
                  helperText={errors.descrizione}
                />
                <TextField
                  label="Valore"
                  fullWidth
                  value={form.valore || ''}
                  onChange={(e) => handleChange('valore', e.target.value)}
                  error={!!errors.valore}
                  helperText={errors.valore}
                />
              </>
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

      <WarningDialog
        open={openConfirmDelete}
        title="Conferma eliminazione"
        message="Sei sicuro di voler eliminare questo elemento?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Elimina"
        confirmColor="error"
      />
      <WarningDialog
        open={openConfirmFatture}
        title="Conferma svuotamento"
        message="Sei sicuro di voler svuotare tutte le fatture dei soci? L'operazione è irreversibile."
        onConfirm={handleConfirmSvuotaFatture}
        onCancel={handleCancelSvuotaFatture}
        confirmText="Svuota"
        confirmColor="error"
      />
      <WarningDialog
        open={openConfirmPagamenti}
        title="Conferma svuotamento"
        message="Sei sicuro di voler svuotare tutti i pagamenti insegnanti? L'operazione è irreversibile."
        onConfirm={handleConfirmSvuotaPagamenti}
        onCancel={handleCancelSvuotaPagamenti}
        confirmText="Svuota"
        confirmColor="error"
      />
      <WarningDialog
        open={openConfirmLogs}
        title="Conferma svuotamento"
        message="Sei sicuro di voler svuotare tutti i logs? L'operazione è irreversibile."
        onConfirm={handleConfirmSvuotaLogs}
        onCancel={handleCancelSvuotaLogs}
        confirmText="Svuota"
        confirmColor="error"
      />
    </Container>
  );
};

export default Amministrazione;
