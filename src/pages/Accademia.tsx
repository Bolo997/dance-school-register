import React, { useCallback, useMemo, useState } from 'react';
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
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import WarningDialog from '../components/WarningDialog';
import SuccessDialog from '../components/SuccessDialog';
import { Accademia, CategoriaCorso, Corso, Socio } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { ERROR_MESSAGES } from '../constants';
import { formatPrice } from '../utils/helpers';
import { logOperation } from '../utils/logs';
import { exportAccademiaExcel } from '../utils/exportAccademiaExcel';
import { supabase } from '../config/supabase';
import { listHasToken, normalizeToken, parseListTokens } from '../utils/listTokens';

const formatCorsiList = (value: string) => {
  if (!value || !String(value).trim()) return '';
  const items = String(value)
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean);
  if (items.length === 0) return '';
  return (
    <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </Box>
  );
};

const hasToken = listHasToken;

const replaceTokenInList = (value: unknown, oldToken: string, newToken: string): string => {
  const oldNeedle = normalizeToken(oldToken);
  const newRaw = String(newToken ?? '').trim();
  if (!oldNeedle || !newRaw) return parseListTokens(value).join(';');

  const next = parseListTokens(value).map((t) => (normalizeToken(t) === oldNeedle ? newRaw : t));
  return Array.from(new Set(next)).join(';');
};

const removeTokenFromList = (value: unknown, token: string): string => {
  const needle = normalizeToken(token);
  if (!needle) return parseListTokens(value).join(';');

  const next = parseListTokens(value).filter((t) => normalizeToken(t) !== needle);
  return Array.from(new Set(next)).join(';');
};

const accademiaColumns = [
  { key: 'id', label: 'Id', width: '8%' },
  { key: 'pacchetto', label: 'Pacchetto', width: '27%' },
  { key: 'categoria', label: 'Categoria', width: '15%' },
  { key: 'corsi', label: 'Corsi', width: '35%', format: formatCorsiList },
  { key: 'prezzo', label: 'Prezzo', format: formatPrice, width: '15%' },
];

const accademiaExcelColumns = [
  { key: 'id', label: 'Id' },
  { key: 'pacchetto', label: 'Pacchetto' },
  { key: 'categoria', label: 'Categoria' },
  {
    key: 'corsi',
    label: 'Corsi',
    format: (value: string) =>
      (value || '')
        .split(';')
        .map((v) => v.trim())
        .filter(Boolean)
        .join('\n'),
  },
  { key: 'prezzo', label: 'Prezzo', format: (value: number) => formatPrice(value) },
];

const AccademiaPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { errors, validate, clearAllErrors } = useFormValidation();

  const { data: corsiData } = useSupabaseData<Corso>('Corsi', { userName: profile?.userName || 'Unknown' });
  const { data: categorie } = useSupabaseData<CategoriaCorso>('CategorieCorsi', { userName: profile?.userName || 'Unknown' });
  const { data: soci, loading: sociLoading, error: sociError, update: updateSocio } = useSupabaseData<Socio>('Soci', { userName: profile?.userName || 'Unknown' });
  const {
    data: accademiaData,
    create: createAccademia,
    update: updateAccademia,
    remove: removeAccademia,
  } = useSupabaseData<Accademia>('Accademia', { userName: profile?.userName || 'Unknown' });

  const accademia = useMemo(() => {
    return [...accademiaData].sort((a, b) => a.pacchetto.localeCompare(b.pacchetto));
  }, [accademiaData]);

  const categoriaColorByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categorie) {
      if (!cat?.categoria) continue;
      map.set(normalizeToken(cat.categoria), cat.colore);
    }
    return map;
  }, [categorie]);

  const corsiOptions = useMemo(() => {
    const sorted = [...corsiData].sort((a, b) => {
      const byCategoria = (a.categoria || '').localeCompare(b.categoria || '');
      if (byCategoria !== 0) return byCategoria;
      return (a.nomeCorso || '').localeCompare(b.nomeCorso || '');
    });

    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of sorted) {
      const name = c.nomeCorso;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      result.push(name);
    }
    return result;
  }, [corsiData]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Accademia | null>(null);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [openConfirmModify, setOpenConfirmModify] = useState(false);
  const [affectedSoci, setAffectedSoci] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const [pacchetto, setPacchetto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [corso, setCorso] = useState('');
  const [prezzo, setPrezzo] = useState<string>('');

  const handleOpenDialog = useCallback((item?: Accademia) => {
    if (item) {
      setEditingItem(item);
      setPacchetto(item.pacchetto);
      setCategoria(item.categoria || '');
      setCorso(item.corsi);
      setPrezzo(item.prezzo != null ? String(item.prezzo) : '');
    } else {
      setEditingItem(null);
      setPacchetto('');
      setCategoria('');
      setCorso('');
      setPrezzo('');
    }
    clearAllErrors();
    setOpenDialog(true);
  }, [clearAllErrors]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingItem(null);
    setPacchetto('');
    setCategoria('');
    setCorso('');
    setPrezzo('');
    clearAllErrors();
  }, [clearAllErrors]);

  const saveItem = useCallback(async () => {
    const payload = {
      pacchetto,
      categoria,
      corsi: corso,
      prezzo: Number(prezzo) || 0,
    };

    const result = editingItem
      ? await updateAccademia(editingItem.id, payload)
      : await createAccademia(payload);

    if (!result.success && result.error?.code === '23505') {
      validate(
        { pacchetto },
        {
          pacchetto: {
            required: true,
            message: 'Pacchetto già presente',
            customValidation: () => false,
          },
        }
      );
      setLoading(false);
      return;
    }

    if (result.success) {
      const tipoOperazione = editingItem ? 'Modifica' : 'Creazione';
      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione,
        lista: 'Accademia',
        elemento: pacchetto + " - " + categoria + " - " + prezzo + "€ - " + corso,
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log:', error);
      });
      handleCloseDialog();
      setOpenSuccess(true);
    }

    setLoading(false);
  }, [pacchetto, categoria, corso, prezzo, editingItem, updateAccademia, createAccademia, validate, profile?.userName, handleCloseDialog]);

  const handleSave = useCallback(async () => {
    setLoading(true);
    clearAllErrors();

    const isValid = validate(
      { pacchetto, categoria, corso },
      {
        pacchetto: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('pacchetto') },
        categoria: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('categoria') },
        corso: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('corso') },
      }
    );

    if (!isValid) {
      setLoading(false);
      return;
    }

    let blockModify = false;
    if (editingItem && editingItem.pacchetto !== pacchetto) {
      const associatedSoci = soci.filter((socio) => hasToken(socio.accademia, editingItem.pacchetto));
      if (associatedSoci.length > 0) {
        setAffectedSoci(associatedSoci);
        setOpenConfirmModify(true);
        blockModify = true;
      }
    }

    if (blockModify) {
      setLoading(false);
      return;
    }

    await saveItem();
  }, [clearAllErrors, validate, pacchetto, categoria, corso, editingItem, soci, saveItem]);

  const handleConfirmModify = useCallback(async () => {
    if (!editingItem) return;

    setOpenConfirmModify(false);
    setLoading(true);

    const payload = {
      pacchetto,
      categoria,
      corsi: corso,
      prezzo: Number(prezzo) || 0,
    };

    const result = await updateAccademia(editingItem.id, payload);

    if (result.success) {
      const oldPacchetto = editingItem.pacchetto;
      const newPacchetto = pacchetto;

      await Promise.all(
        affectedSoci.map(async (socio) => {
          if (!hasToken(socio.accademia, oldPacchetto)) return;
          const updatedAccademia = replaceTokenInList(socio.accademia, oldPacchetto, newPacchetto);
          return updateSocio(socio.id, { ...socio, accademia: updatedAccademia });
        })
      );

      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione: 'Modifica',
        lista: 'Accademia',
        elemento: pacchetto + " - " + categoria + " - " + prezzo + "€ - " + corso,
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log:', error);
      });

      handleCloseDialog();
      setOpenSuccess(true);
    }

    setLoading(false);
    setAffectedSoci([]);
  }, [editingItem, pacchetto, categoria, corso, prezzo, updateAccademia, affectedSoci, updateSocio, profile?.userName, handleCloseDialog]);

  const handleDelete = useCallback(
    async (id: string) => {
      const toRemove = accademia.find((a) => a.id === id);
      if (!toRemove) return;

      let sociSource: Socio[] = soci;
      // Se la lista Soci non è pronta, usiamo una fetch puntuale per evitare falsi negativi.
      if (sociLoading || sociError) {
        const { data, error } = await supabase.from('Soci').select('*');
        if (!error && Array.isArray(data)) {
          sociSource = data as Socio[];
        }
      }

      const associatedSoci = sociSource.filter((socio) => hasToken(socio.accademia, toRemove.pacchetto));
      setAffectedSoci(associatedSoci);
      setItemToDelete(id);
      setOpenConfirmDelete(true);
    },
    [accademia, soci, sociLoading, sociError]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setLoading(true);
    const toRemove = accademia.find((a) => a.id === itemToDelete);

    if (toRemove) {
      await Promise.all(
        affectedSoci.map(async (socio) => {
          if (!hasToken(socio.accademia, toRemove.pacchetto)) return;
          const updatedAccademia = removeTokenFromList(socio.accademia, toRemove.pacchetto);
          return updateSocio(socio.id, { ...socio, accademia: updatedAccademia });
        })
      );
    }

    const deleteResult = await removeAccademia(itemToDelete);
    if (deleteResult.success && toRemove) {
      logOperation({
        utente: profile?.userName || 'Unknown',
        tipoOperazione: 'Eliminazione',
        lista: 'Accademia',
        elemento: "idPacc " + toRemove.id + ": " + toRemove.pacchetto + " - " + toRemove.categoria + " - " + toRemove.prezzo + "€ - " + toRemove.corsi,
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Errore durante la scrittura del log:', error);
      });
    }

    setLoading(false);
    setOpenConfirmDelete(false);
    setItemToDelete(null);
    setAffectedSoci([]);
  }, [itemToDelete, accademia, affectedSoci, updateSocio, removeAccademia, profile?.userName]);

  const handleCancelDelete = useCallback(() => {
    setOpenConfirmDelete(false);
    setItemToDelete(null);
    setAffectedSoci([]);
  }, []);

  const accademiaTable = useMemo(
    () => (
      <DataTable
        title="Accademia"
        columns={accademiaColumns}
        data={accademia}
        onAdd={() => handleOpenDialog()}
        onEdit={handleOpenDialog}
        onDelete={handleDelete}
        emptyMessage="Nessun pacchetto presente"
        renderCell={(row, column) => {
          if (column.key !== 'categoria') return undefined;

          const label = String(row.categoria ?? '').trim();
          if (!label) return '';

          const colore = categoriaColorByName.get(normalizeToken(label));
          return (
            <Chip
              label={label}
              size="small"
              sx={{
                fontWeight: 600,
                border: '1px solid',
                borderColor: colore ?? 'divider',
                backgroundColor: colore ? colore + '20' : 'transparent',
              }}
            />
          );
        }}
      />
    ),
    [accademia, handleOpenDialog, handleDelete, categoriaColorByName]
  );

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
        <Typography variant="h5">Gestione Accademia</Typography>

        {profile?.role !== 'reader' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            sx={{ fontWeight: 600, textTransform: 'none', ml: 'auto' }}
            onClick={() => exportAccademiaExcel(accademia, accademiaExcelColumns)}
          >
            Export Excel
          </Button>
        )}
      </Box>

      {accademiaTable}

      <SuccessDialog open={openSuccess} onClose={() => setOpenSuccess(false)} />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Modifica Pacchetto' : 'Nuovo Pacchetto'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Pacchetto"
              fullWidth
              value={pacchetto}
              onChange={(e) => setPacchetto(e.target.value)}
              error={!!errors.pacchetto}
              helperText={errors.pacchetto}
            />

            <TextField
              select
              label="Categoria"
              fullWidth
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              error={!!errors.categoria}
              helperText={errors.categoria}
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
                      verticalAlign: 'middle',
                    }}
                  />
                  {cat.categoria}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Corsi"
              fullWidth
              value={Array.isArray(corso) ? corso : (corso ? String(corso).split(';').filter(Boolean) : [])}
              onChange={(e) => {
                const value = (e.target as HTMLInputElement).value as unknown;
                setCorso(Array.isArray(value) ? value.join(';') : String(value));
              }}
              SelectProps={{
                multiple: true,
                autoWidth: true,
                MenuProps: {
                  PaperProps: {
                    sx: { width: 450, maxWidth: 450 },
                  },
                },
                renderValue: (selected: unknown) => {
                  const values = Array.isArray(selected) ? (selected as string[]) : [];
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {values.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  );
                },
              }}
              error={!!errors.corso}
              helperText={errors.corso}
            >
              {corsiOptions.map((nomeCorso: string) => {
                const corsoObj = corsiData.find((c) => c.nomeCorso === nomeCorso);
                const corsoCat = corsoObj ? categorie.find((cat) => cat.categoria === corsoObj.categoria) : null;
                const selected = Array.isArray(corso)
                  ? corso.includes(nomeCorso)
                  : (corso ? String(corso).split(';').includes(nomeCorso) : false);

                return (
                  <MenuItem key={nomeCorso} value={nomeCorso}>
                    <Checkbox checked={selected} sx={{ mr: 1 }} />
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: corsoCat?.colore ? corsoCat.colore + '40' : 'primary.light',
                        display: 'inline-block',
                      }}
                    >
                      {nomeCorso}
                    </Box>
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField
              label="Prezzo €"
              type="number"
              fullWidth
              value={prezzo}
              onChange={(e) => setPrezzo(e.target.value)}
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

      <WarningDialog
        open={openConfirmDelete}
        title={affectedSoci.length > 0 ? 'ATTENZIONE!' : 'Conferma eliminazione'}
        message={
          affectedSoci.length > 0
            ? 'Il pacchetto è associato ai seguenti soci. Se procedi verrà rimosso anche da loro:'
            : 'Sei sicuro di voler eliminare questo pacchetto?'
        }
        items={
          affectedSoci.length > 0
            ? affectedSoci.map((socio) => ({ id: socio.id, label: `${socio.cognome} ${socio.nome}` }))
            : undefined
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Elimina"
        confirmColor="error"
      />

      <WarningDialog
        open={openConfirmModify}
        title="ATTENZIONE!"
        message="Ci sono dei soci associati a questo pacchetto. Se procedi la modifica verrà applicata anche a loro:"
        items={affectedSoci.map((socio) => ({ id: socio.id, label: `${socio.cognome} ${socio.nome}` }))}
        onConfirm={handleConfirmModify}
        onCancel={() => setOpenConfirmModify(false)}
        confirmText="Procedi"
      />
    </Container>
  );
};

export default AccademiaPage;
