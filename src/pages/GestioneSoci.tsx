import React, { useState, useCallback, useMemo } from 'react';
import SocioFormDialog from './GestioneSociDialog';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import WarningDialog from '../components/WarningDialog';
import ErrorDialog from '../components/ErrorDialog';
import { Socio } from '../types';
import { formatEuro } from '../utils/formatters';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { exportSociExcel } from '../utils/exportSociExcel';
import { logOperation } from '../utils/logs';

const parseItalianDateToMidnight = (value?: string): Date | null => {
  if (!value) return null;
  const raw = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const isExpiredItalianDate = (value?: string): boolean => {
  const date = parseItalianDateToMidnight(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const fixedColumns = [
  { key: 'id', label: 'Id', width: '60px' },
  { key: 'cognome', label: 'Cognome', width: '160px' },
  { key: 'nome', label: 'Nome', width: '140px' },
  { key: 'iscrizione', label: 'Iscrizione', width: '90px' },
  { key: 'modulo', label: 'Modulo', width: '90px' },
  { key: 'agonistico', label: 'Agonistico', width: '90px' },
  { key: 'sospeso', label: 'Sospeso', width: '90px' },
  { key: 'scadenzaTessera', label: 'Scadenza Tessera', width: '110px' },
  { key: 'scadenzaCertificato', label: 'Scadenza Certificato', width: '160px' },
  { key: 'dataIscrizione', label: 'Data Iscrizione', width: '110px' },
  { key: 'quotaIscrizione', label: 'Quota Iscrizione', width: '110px', align: 'center', format: formatEuro },
  { key: 'quotaMensile', label: 'Quota Mensile', width: '110px', align: 'center', format: formatEuro },
  { key: 'quotaSaggio', label: 'Quota Saggio', width: '110px', align: 'center', format: formatEuro },
];
const scrollableColumns = [
  { key: 'accademia', label: 'Accademia', width: '250px' },
  { key: 'base', label: 'Base', width: '250px' },
  { key: 'corsi', label: 'Corsi', width: '250px' },
  { key: 'codFiscale', label: 'Cod. Fiscale', width: '250px' },
  { key: 'dataNascita', label: 'Data Nascita', width: '130px' },
  { key: 'luogoNascita', label: 'Luogo Nascita', width: '160px' },
  { key: 'provinciaNascita', label: 'Provincia Nascita', width: '90px' },
  { key: 'indirizzo', label: 'Indirizzo', width: '250px' },
  { key: 'residenza', label: 'Residenza', width: '160px' },
  { key: 'provinciaResidenza', label: 'Provincia Residenza', width: '90px' },
  { key: 'telefono', label: 'Telefono', width: '140px' },
  { key: 'email', label: 'Email', width: '250px' },
  { key: 'note', label: 'Note', width: '250px' },
  { key: 'cognomeGenitore', label: 'Cognome Genitore', width: '250px' },
  { key: 'nomeGenitore', label: 'Nome Genitore', width: '250px' },
  { key: 'codFiscaleGenitore', label: 'Cod. Fiscale Genitore', width: '250px' }
];

const allColumns = [...fixedColumns, ...scrollableColumns];

const GestioneSoci: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    data: soci,
    loading: loadingSoci,
    remove,
    create: createSocio,
    update: updateSocio,
  } = useSupabaseData<Socio>('Soci', { userName: profile?.userName || 'Unknown' });
  const { clearAllErrors } = useFormValidation();

  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<string | null>(null);
  const [openErrorDialog, setOpenErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  // Stato di caricamento per la cancellazione
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenDialog = useCallback((socio?: Socio) => {
    setEditingSocio(socio || null);
    clearAllErrors();
    setOpenDialog(true);
  }, [clearAllErrors]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingSocio(null);
    clearAllErrors();
  }, [clearAllErrors]);

  const handleDialogSave = async () => {
    handleCloseDialog();
  };

  const handleDelete = useCallback((id: string) => {
    setSocioToDelete(id);
    setOpenConfirmDelete(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (socioToDelete) {
      setDeleteLoading(true);
      const socio = soci.find((s) => s.id === socioToDelete);
      const result = await remove(socioToDelete);
      if (!result.success && result.error?.code === '23503') {
        setErrorMessage("Impossibile eliminare il socio perché ha delle fatture associate. Elimina prima le fatture.");
        setOpenErrorDialog(true);
        setOpenConfirmDelete(false);
      } else {
        if (result.success && socio) {
          const elemento = `${socio.cognome} ${socio.nome}`.trim();
          logOperation({
            utente: profile?.userName || 'Unknown',
            tipoOperazione: 'Eliminazione',
            lista: 'Soci',
            elemento,
          }).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Errore durante la scrittura del log:', error);
          });
        }
        setOpenConfirmDelete(false);
        setSocioToDelete(null);
      }
      setDeleteLoading(false);
    }
  }, [socioToDelete, remove, soci, profile]);
  const handleCloseErrorDialog = useCallback(() => {
    setOpenErrorDialog(false);
    setErrorMessage('');
  }, []);

  const handleCancelDelete = useCallback(() => {
    setOpenConfirmDelete(false);
    setSocioToDelete(null);
  }, []);

  const handleModulo = useCallback((socio: Socio) => {
    navigate(`/modulo-iscrizione/${socio.id}`);
  }, [navigate]);

  // Sticky offsets per colonne a sinistra (considera colonna azioni 100px)
  const stickyOffsets = useMemo(() => {
    const parseW = (w?: string) => (w ? parseInt(w, 10) : 0);
    let acc = 100; // larghezza colonna azioni di default
    const offsets: Record<string, number> = {};
    const pinnedKeys = new Set(['id', 'cognome', 'nome']);
    for (const col of allColumns) {
      if (pinnedKeys.has(col.key)) {
        offsets[col.key] = acc;
      }
      acc += parseW(col.width);
    }
    return offsets;
  }, []);

  const getCellSx = useCallback((row: any, col: { key: string }) => {
    if (col.key === 'id' || col.key === 'cognome' || col.key === 'nome') {
      const left = stickyOffsets[col.key] ?? 0;
      return { position: 'sticky', left, zIndex: 1, bgcolor: 'background.paper' };
    }
    return undefined;
  }, [stickyOffsets]);

  const getHeadCellSx = useCallback((col: { key: string }) => {
    if (col.key === 'id' || col.key === 'cognome' || col.key === 'nome') {
      const left = stickyOffsets[col.key] ?? 0;
      return { position: 'sticky', left, top: 0, zIndex: 3, bgcolor: 'background.paper' };
    }
    return undefined;
  }, [stickyOffsets]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/soci')}
          sx={{ color: 'primary.main' }}
          title="Torna a Soci"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Gestione Soci
        </Typography>
        {profile?.role !== 'reader' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            sx={{ fontWeight: 600, textTransform: 'none', ml: 'auto' }}
            onClick={() => exportSociExcel(soci, allColumns)}
          >
            Export Excel
          </Button>
        )}
      </Box>

      {(loadingSoci || deleteLoading) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <CircularProgress />
        </Box>
      ) : (
      <DataTable
        title="Soci"
        columns={allColumns}
        data={soci}
        onAdd={() => handleOpenDialog()}
        onEdit={handleOpenDialog}
        onDelete={handleDelete}
        onModulo={handleModulo}
        emptyMessage="Nessun socio presente"
        getCellSx={getCellSx}
        getHeadCellSx={getHeadCellSx}
        renderCell={(row, col) => {
          if (col.key === 'iscrizione' || col.key === 'modulo' || col.key === 'agonistico' || col.key === 'sospeso') {
            return (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {row[col.key] ? (
                  <CheckCircleIcon sx={{ color: 'green' }} />
                ) : (
                  <CancelIcon sx={{ color: 'darkred' }} />
                )}
              </Box>
            );
          }
          if (col.key === 'scadenzaTessera' || col.key === 'scadenzaCertificato') {
            const value = row[col.key] as string;
            const expired = isExpiredItalianDate(value);
            return (
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: expired ? '#ffebee' : 'transparent',
                  color: expired ? '#b71c1c' : 'inherit',
                  fontWeight: expired ? 700 : 'inherit',
                  display: 'inline-block',
                  minWidth: 90,
                  textAlign: 'center',
                }}
              >
                {value || ''}
              </Box>
            );
          }
          if (col.key === 'corsi') {
            const corsiArray = row.corsi ? row.corsi.split(';').filter((c: string) => c.trim()) : [];
            return (
              <Box component="ul" sx={{ margin: 0, paddingLeft: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {corsiArray.map((corso: string, index: number) => (
                  <li key={index}>
                    <Typography variant="body2">{corso}</Typography>
                  </li>
                ))}
              </Box>
            );
          }
          // Per le altre colonne lascia che DataTable usi col.format / valore di default
          return undefined;
        }}
      />
      )}
      <SocioFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        initialForm={editingSocio || {}}
        editingSocio={editingSocio}
        createSocio={createSocio}
        updateSocio={updateSocio}
        onSave={handleDialogSave}
      />

      <WarningDialog
        open={openConfirmDelete}
        title="Conferma eliminazione"
        message="Sei sicuro di voler eliminare questo socio?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Elimina"
        confirmColor="error"
      />
      <ErrorDialog
        open={openErrorDialog}
        title="Errore"
        message={errorMessage}
        onClose={handleCloseErrorDialog}
        closeText="OK"
      />
    </Container>
  );
};

export default GestioneSoci;
