
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportFattureExcel } from '../utils/exportFattureExcel';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import SuccessDialog from '../components/SuccessDialog';
import { Column, Fattura, Socio } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { ERROR_MESSAGES } from '../constants';
import { logOperation } from '../utils/logs';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatEuro, formatDate } from '../utils/formatters';

const Soci: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: soci, loading: loadingSoci } = useSupabaseData<Socio>('Soci', { userName: profile?.userName || 'Unknown' });
  const { 
    data: fatture, 
    create: createFattura, 
    update: updateFattura,
    loading: loadingFatture
  } = useSupabaseData<Fattura>('Fatture', { userName: profile?.userName || 'Unknown' });
  const { errors, validate, clearAllErrors } = useFormValidation();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingFattura, setEditingFattura] = useState<Fattura | null>(null);
  const [form, setForm] = useState<Partial<Fattura>>({});
  const [loading, setLoading] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  
  // Stato per i pagamenti mensili
  const [meseSelezionato, setMeseSelezionato] = useState('');
  const [importoPagamento, setImportoPagamento] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [quotaSaggioFlag, setQuotaSaggioFlag] = useState(false);
  const [notePagamento, setNotePagamento] = useState('');
  const [pagamentiMensili, setPagamentiMensili] = useState<{mese: string, importo: number, metodo?: string, data?: string, quotaSaggio?: boolean, note?: string}[]>([]);

  const mesiDisponibili = ['Settembre', 'Ottobre', 'Novembre', 'Dicembre', 
    'Gennaio', 'Febbraio', 'Marzo', 
    'Aprile', 'Maggio', 'Giugno',
    '1° Trimestre','2° Trimestre','3° Trimestre', 'Annuale', 'Vari'
  ];

  // Combina i dati dei soci con le fatture
  const fattureConSoci = useMemo(() => {
    return soci.map(socio => {
      const fattura = fatture.find(f => f.idSocio === socio.id);
      
      // Parsing dei pagamenti dal campo pagamenti
      const pagamentiMap: { [key: string]: number } = {};
      if (fattura?.pagamenti) {
        fattura.pagamenti.split(';').filter(p => p.trim()).forEach(item => {
          const addPagamento = (mese: string, importo: number) => {
            const key = mese.trim();
            if (!key) return;
            pagamentiMap[key] = (pagamentiMap[key] || 0) + (importo || 0);
          };

          if (item.includes('-')) {
            const parts = item.split('-');
            const mese = parts[0]?.trim();
            const importoStr = parts[1]?.trim();
            if (mese && importoStr) {
              addPagamento(mese, parseFloat(importoStr) || 0);
            }
          } else {
            const [mese, importo] = item.split(':');
            if (mese && importo) {
              addPagamento(mese, parseFloat(importo) || 0);
            }
          }
        });
      }
      
      return {
        id: fattura?.id || socio.id,
        idSocio: socio.id,
        nome: socio.nome,
        cognome: socio.cognome,
        quotaIscrizione: socio.quotaIscrizione || '',
        quotaMensile: socio.quotaMensile || '',
        sospeso: socio.sospeso || false,
        quotaSaggio: socio.quotaSaggio || '',
        primoTrimestre: pagamentiMap['1° Trimestre'] ?? '',
        secondoTrimestre: pagamentiMap['2° Trimestre'] ?? '',
        terzoTrimestre: pagamentiMap['3° Trimestre'] ?? '',
        annuale: pagamentiMap['Annuale'] ?? '',
        vari: pagamentiMap['Vari'],
        settembre: pagamentiMap['Settembre'] ?? '',
        ottobre: pagamentiMap['Ottobre'] ?? '',
        novembre: pagamentiMap['Novembre'] ?? '',
        dicembre: pagamentiMap['Dicembre'] ?? '',
        gennaio: pagamentiMap['Gennaio'] ?? '',
        febbraio: pagamentiMap['Febbraio'] ?? '',
        marzo: pagamentiMap['Marzo'] ?? '',
        aprile: pagamentiMap['Aprile'] ?? '',
        maggio: pagamentiMap['Maggio'] ?? '',
        giugno: pagamentiMap['Giugno'] ?? '',
        pagamenti: fattura?.pagamenti || '',
        creato: fattura?.creato || '',
        modificato: fattura?.modificato,
        _hasFattura: !!fattura
      };
    });
  }, [soci, fatture]);

  // Mostra la quota saggio del socio selezionato nella label
  const quotaSaggioDisplay = useMemo(() => {
    const socioSelezionato = soci.find((s) => s.id === (form.idSocio as string));
    const value = socioSelezionato ? formatEuro(socioSelezionato.quotaSaggio) : '';
    return value || '-';
  }, [soci, form.idSocio]);

  const sociOrdinati = useMemo(() => {
    return [...soci].sort((a, b) => {
      const byCognome = (a.cognome || '').localeCompare((b.cognome || ''), 'it', { sensitivity: 'base' });
      if (byCognome !== 0) return byCognome;
      return (a.nome || '').localeCompare((b.nome || ''), 'it', { sensitivity: 'base' });
    });
  }, [soci]);

  const parsePagamenti = useCallback((pagamentiString: string) => {
    if (!pagamentiString) {
      setPagamentiMensili([]);
      return;
    }
    const parsed = pagamentiString.split(';').filter(p => p.trim()).map(item => {
      if (item.includes('-')) {
        const [mese, importoStr, metodo, data, quotaSaggioStr, ...noteParts] = item.split('-');
        const note = (noteParts || []).join('-').trim();
        return {
          mese: (mese || '').trim(),
          importo: parseFloat(importoStr || '0') || 0,
          metodo: (metodo || '').trim(),
          data: (data || '').trim(),
          quotaSaggio: (quotaSaggioStr || '').trim().toLowerCase() === 'true',
          note: note || undefined
        };
      }
      const [mese, importo] = item.split(':');
      return { mese: (mese || '').trim(), importo: parseFloat(importo || '0') || 0 };
    });
    setPagamentiMensili(parsed);
  }, []);

  const handleOpenDialog = useCallback((row?: any) => {
    setImportoPagamento('');
    setMetodoPagamento('');
    setQuotaSaggioFlag(false);
    setNotePagamento('');
    setPaymentAttempted(false);
    if (row) {
      setEditingFattura(row._hasFattura ? { ...row } : null);
      setForm({
        idSocio: row.idSocio,
        pagamenti: row.pagamenti,
      });
      calcolaImporto(row.quotaMensile, row.quotaSaggio);
      parsePagamenti(row.pagamenti || '');
    } else {
      setEditingFattura(null);
      setForm({});
      setPagamentiMensili([]);
    }
    setMeseSelezionato('');
    clearAllErrors();
    setOpenDialog(true);
  }, [clearAllErrors, parsePagamenti]);

  const serializePagamenti = useCallback((pagamenti: {mese: string, importo: number, metodo?: string, data?: string, quotaSaggio?: boolean, note?: string}[]) => {
    return pagamenti
      .map(p => {
        const base = `${p.mese}-${p.importo.toFixed(2)}-${(p.metodo || '').trim()}-${(p.data || '').trim()}-${p.quotaSaggio ? 'true' : 'false'}`;
        const note = (p.note || '').toString().replace(/\s+/g, ' ').replace(/;/g, ',').trim();
        return note ? `${base}-${note}` : base;
      })
      .join(';');
  }, []);

  const calcolaImporto = useCallback((quotaMensile: number | string, quotaSaggio: number | string) => {
    if (!meseSelezionato) {
      setImportoPagamento('');
      return;
    }
    const qm = (typeof quotaMensile === 'string' ? parseFloat(quotaMensile) : quotaMensile) || 0;
    const qs = (typeof quotaSaggio === 'string' ? parseFloat(quotaSaggio) : quotaSaggio) || 0;
    let importoFinale = 0;
    let moltiplicatore = 1;
    if (meseSelezionato === 'Annuale') {
      moltiplicatore = 9;
      importoFinale = (qm * moltiplicatore) - ((qm * 9) / 100 * 15);
    } else if (meseSelezionato.indexOf('Trimestre') !== -1) {
      moltiplicatore = 3;
      importoFinale = (qm * moltiplicatore) - ((qm * 3) / 100 * 15);
    } else if (meseSelezionato === 'Vari') {
      setImportoPagamento('');
      return;
    } else {
      importoFinale = qm;
    }
    if (quotaSaggioFlag) {
      importoFinale = importoFinale + (qs * moltiplicatore);
    }
    setImportoPagamento(importoFinale > 0 ? importoFinale.toString() : '');
  }, [meseSelezionato, quotaSaggioFlag]);

  const handleSocioSelect = useCallback((socioId: string) => {
    clearAllErrors();
    setMeseSelezionato('');
    setImportoPagamento('');
    setMetodoPagamento('');
    setQuotaSaggioFlag(false);
    setNotePagamento('');
    setPaymentAttempted(false);

    if (!socioId) {
      setEditingFattura(null);
      setForm({});
      setPagamentiMensili([]);
      return;
    }

    const fattura = fatture.find((f) => f.idSocio === socioId) || null;
    setEditingFattura(fattura);
    setForm({
      idSocio: socioId,
      pagamenti: fattura?.pagamenti || '',
    });
    parsePagamenti(fattura?.pagamenti || '');
  }, [clearAllErrors, fatture, parsePagamenti]);

  // Ricalcola importo al cambio di Periodo, Quota Saggio o Nome e Cognome
  useEffect(() => {
    const socioSelezionato = soci.find((s) => s.id === (form.idSocio as string));
    const qm = socioSelezionato ? socioSelezionato.quotaMensile : 0;
    const qs = socioSelezionato ? socioSelezionato.quotaSaggio : 0;
    calcolaImporto(qm as any, qs as any);
  }, [meseSelezionato, quotaSaggioFlag, form.idSocio, soci, calcolaImporto]);

  const renderCell = useCallback((row: any, col: Column) => {
    if (col.key === 'sospeso') {
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
    return undefined;
  }, []);

  

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingFattura(null);
    setForm({});
    setPagamentiMensili([]);
    setMeseSelezionato('');
    setImportoPagamento('');
    setMetodoPagamento('');
    setQuotaSaggioFlag(false);
    setNotePagamento('');
    setPaymentAttempted(false);
    clearAllErrors();
  }, [clearAllErrors]);

  const handleAggiungiPagamento = useCallback(() => {
    setPaymentAttempted(true);
    const importoNum = parseFloat(importoPagamento);
    if (!meseSelezionato || !metodoPagamento.trim() || !importoPagamento || Number.isNaN(importoNum) || importoNum <= 0) return;

    const cleanedNote = notePagamento.toString().replace(/\s+/g, ' ').replace(/;/g, ',').trim();

    const nowStr = formatDate(new Date());
      setPagamentiMensili(prev => [...prev, { 
        mese: meseSelezionato, 
        importo: importoNum,
        metodo: metodoPagamento.trim(),
        data: nowStr,
        quotaSaggio: quotaSaggioFlag,
        note: cleanedNote || undefined
      }]);
    setMeseSelezionato('');
    setImportoPagamento('');
    setMetodoPagamento('');
    setQuotaSaggioFlag(false);
    setNotePagamento('');
    setPaymentAttempted(false);
  }, [meseSelezionato, importoPagamento, metodoPagamento, quotaSaggioFlag, pagamentiMensili, notePagamento]);

  const handleRimuoviPagamento = useCallback((index: number) => {
    setPagamentiMensili(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleChange = useCallback((field: keyof Fattura, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    clearAllErrors();
    
    const isValid = validate(form, {
      idSocio: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('socio') },
    });
    
    if (!isValid) {
      setLoading(false);
      return;
    }

    const fatturaData = {
      idSocio: form.idSocio!,
      pagamenti: serializePagamenti(pagamentiMensili)
    };

    let result;
    const isUpdate = !!(editingFattura && editingFattura.id);
    if (isUpdate) {
      result = await updateFattura(editingFattura.id, fatturaData);
    } else {
      result = await createFattura(fatturaData);
    }
    
    if (result.success) {
      if (isUpdate) {
        const elemento = `socio ${fatturaData.idSocio}: ${fatturaData.pagamenti}`;
        logOperation({
          utente: profile?.userName || 'Unknown',
          tipoOperazione: 'Modifica',
          lista: 'Fatture',
          elemento,
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Errore durante la scrittura del log:', error);
        });
      }
      handleCloseDialog();
      setOpenSuccess(true);
    }
    setLoading(false);
  };

  const fattureColumns: Column[] = useMemo(() => ([
    { key: 'nome', label: 'Nome', width: '150px' },
    { key: 'cognome', label: 'Cognome', width: '150px' }, 
    { key: 'sospeso', label: 'Sospeso', width: '80px'},
    { key: 'quotaIscrizione', label: 'Quota Iscrizione', width: '100px', align: 'center', format: formatEuro },
    { key: 'quotaMensile', label: 'Quota Mensile', width: '100px', align: 'center', format: formatEuro },
    { key: 'quotaSaggio', label: 'Quota Saggio', width: '100px', align: 'center', format: formatEuro },
     { key: 'settembre', label: 'Settembre', width: '100px', align: 'center', format: formatEuro },
    { key: 'ottobre', label: 'Ottobre', width: '100px', align: 'center', format: formatEuro },
    { key: 'novembre', label: 'Novembre', width: '100px', align: 'center', format: formatEuro },
    { key: 'dicembre', label: 'Dicembre', width: '100px', align: 'center', format: formatEuro },
    { key: 'gennaio', label: 'Gennaio', width: '100px', align: 'center', format: formatEuro },
    { key: 'febbraio', label: 'Febbraio', width: '100px', align: 'center', format: formatEuro },
    { key: 'marzo', label: 'Marzo', width: '100px', align: 'center', format: formatEuro },
    { key: 'aprile', label: 'Aprile', width: '100px', align: 'center', format: formatEuro },
    { key: 'maggio', label: 'Maggio', width: '100px', align: 'center', format: formatEuro },
    { key: 'giugno', label: 'Giugno', width: '100px', align: 'center', format: formatEuro },
    { key: 'primoTrimestre', label: '1° Trimestre', width: '140px', align: 'center', format: formatEuro },
    { key: 'secondoTrimestre', label: '2° Trimestre', width: '140px', align: 'center', format: formatEuro },
    { key: 'terzoTrimestre', label: '3° Trimestre', width: '140px', align: 'center', format: formatEuro },
    { key: 'annuale', label: 'Annuale', width: '140px', align: 'center', format: formatEuro },
    { key: 'vari', label: 'Vari', width: '140px', align: 'center', format: formatEuro },
    ]), []);

  // Offset di sinistra per colonne sticky (usa larghezza azioni configurabile)
  const stickyOffsets = useMemo(() => {
    const parseW = (w?: string) => (w ? parseInt(w, 10) : 0);
    const actionColumnWidth = 56; // più stretto: solo Edit
    let acc = actionColumnWidth; // azioni
    const offsets: Record<string, number> = {};
    for (const col of fattureColumns) {
      if (col.key === 'nome') offsets['nome'] = acc;
      acc += parseW(col.width);
      if (col.key === 'cognome') offsets['cognome'] = acc - parseW(col.width);
    }
    return offsets;
  }, [fattureColumns]);

  const getCellSx = useCallback((row: any, col: Column) => {
    const key = col.key;
    const green = { bgcolor: 'rgba(76, 175, 80, 0.12)' } as const;

    const isFilled = (v: any): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'number') return v > 0;
      if (typeof v === 'string') return v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) > 0 : v.trim() !== '';
      return !!v;
    };

    // Annuale: if filled, all columns after 'annuale' marked green
    const annFilled = isFilled(row.annuale);
    if (annFilled) {
      const annIdx = fattureColumns.findIndex(c => c.key === 'annuale');
      const colIdx = fattureColumns.findIndex(c => c.key === key);
      if (colIdx < annIdx && colIdx > 5) return green;
    }

    // Trimestri: mark months in respective ranges if trimester is filled
    const primoFilled = isFilled(row.primoTrimestre);
    const secondoFilled = isFilled(row.secondoTrimestre);
    const terzoFilled = isFilled(row.terzoTrimestre);

    if (primoFilled && ['settembre','ottobre','novembre','dicembre'].includes(key)) return green;
    if (secondoFilled && ['gennaio','febbraio','marzo'].includes(key)) return green;
    if (terzoFilled && ['aprile','maggio','giugno'].includes(key)) return green;

    // Sticky a sinistra per Nome e Cognome
    if (key === 'nome' || key === 'cognome') {
      const left = stickyOffsets[key] ?? 0;
      return { position: 'sticky', left, zIndex: 1, bgcolor: 'background.paper' };
    }

    return undefined;
  }, [fattureColumns, stickyOffsets]);

  const getHeadCellSx = useCallback((col: Column) => {
    if (col.key === 'nome' || col.key === 'cognome') {
      const left = stickyOffsets[col.key] ?? 0;
      return { position: 'sticky', left, top: 0, zIndex: 3, bgcolor: 'background.paper' };
    }
    return undefined;
  }, [stickyOffsets]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Registro Soci
      </Typography>

      {(loadingSoci || loadingFatture) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/gestione-soci')}>
          Gestione Soci
        </Button>
         {profile?.role !== "reader" && (<Button
          variant="contained"
          color="success"
          startIcon={<FileDownloadIcon />}
          sx={{ fontWeight: 600, textTransform: 'none' }}
          onClick={() => exportFattureExcel(fattureConSoci, fattureColumns)}
        >
          Export Excel
        </Button>)}
      </Box>

      <DataTable
        title="Fatture"
        columns={fattureColumns}
        data={fattureConSoci}
        onEdit={handleOpenDialog}
        emptyMessage="Nessun socio presente"
        renderCell={renderCell}
        getCellSx={getCellSx}
        actionColumnWidth={56}
        getHeadCellSx={getHeadCellSx}
      />

      <SuccessDialog
        open={openSuccess}
        onClose={() => setOpenSuccess(false)}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Fatturazione</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Nome e Cognome"
              fullWidth
              value={form.idSocio || ''}
              onChange={(e) => handleSocioSelect(e.target.value)}
              error={!!errors.idSocio}
              helperText={errors.idSocio}
            >
              {sociOrdinati.map((socio) => (
                <MenuItem key={socio.id} value={socio.id}>
                  {socio.cognome} {socio.nome}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Pagamenti
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2, bgcolor: 'background.default' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Aggiungi un nuovo pagamento
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                    <TextField
                      select
                      label="Periodo"
                      size="small"
                      value={meseSelezionato}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMeseSelezionato(value);
                        if (value === 'Vari' || value === 'Varie') setQuotaSaggioFlag(false);
                      }}
                      sx={{ flex: 1, maxWidth: 242 }}
                      required
                      error={paymentAttempted && !meseSelezionato}
                      helperText={paymentAttempted && !meseSelezionato ? 'Campo obbligatorio' : ''}
                    >
                      {mesiDisponibili.map((mese) => (
                        <MenuItem key={mese} value={mese}>
                          {mese}
                        </MenuItem>
                      ))}
                    </TextField>
                    {meseSelezionato !== 'Vari' && meseSelezionato !== 'Varie' && (
                      <FormControlLabel
                        control={<Checkbox checked={quotaSaggioFlag} onChange={(e) => setQuotaSaggioFlag(e.target.checked)} />}
                        label={`Quota Saggio (${quotaSaggioDisplay})`}
                        labelPlacement="end"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                    <TextField
                      select
                      label="Metodo di pagamento"
                      size="small"
                      value={metodoPagamento}
                      onChange={(e) => setMetodoPagamento(e.target.value)}
                      fullWidth
                      required
                      error={paymentAttempted && !metodoPagamento.trim()}
                      helperText={paymentAttempted && !metodoPagamento.trim() ? 'Campo obbligatorio' : ''}
                    >
                      <MenuItem value="CARTA">CARTA</MenuItem>
                      <MenuItem value="BONIFICO">BONIFICO</MenuItem>
                      <MenuItem value="CONTANTI">CONTANTI</MenuItem>
                      <MenuItem value="VOUCHER">VOUCHER</MenuItem>
                      <MenuItem value="COMPENSAZIONE">COMPENSAZIONE</MenuItem>
                    </TextField>
                    <TextField
                      label="Importo €"
                      type="number"
                      size="small"
                      value={importoPagamento}
                      onChange={(e) => setImportoPagamento(e.target.value)}
                      inputProps={{ step: '0.01', min: '0' }}
                      fullWidth
                      required
                      error={paymentAttempted && (!importoPagamento || Number.isNaN(parseFloat(importoPagamento)) || parseFloat(importoPagamento) <= 0)}
                      helperText={paymentAttempted && (!importoPagamento || Number.isNaN(parseFloat(importoPagamento)) || parseFloat(importoPagamento) <= 0) ? 'Inserisci un importo valido' : ''}
                    />
                    </Box>
                  <TextField
                    label="Note"
                    fullWidth
                    multiline
                    rows={2}
                    value={notePagamento}
                    sx={{ marginBottom: 2 }}
                    onChange={(e) => setNotePagamento(e.target.value)}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleAggiungiPagamento}
                      disabled={loading}
                      startIcon={<AddIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Aggiungi
                    </Button>
                  </Box>
                </CardContent>
              </Card>
              
              {pagamentiMensili.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Pagamenti registrati ({pagamentiMensili.length})
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    {pagamentiMensili.map((pag, index) => (
                      <Card 
                        key={`${pag.mese}-${pag.data || ''}-${index}`}
                        variant="outlined" 
                        sx={{ 
                          bgcolor: 'primary.50',
                          borderColor: 'primary.main',
                          position: 'relative',
                          '&:hover': {
                            bgcolor: 'primary.100',
                            boxShadow: 1
                          }
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {pag.mese}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                                  €{pag.importo.toFixed(2)}
                                </Typography>
                                {!!pag.note?.trim() && (
                                  <Tooltip title={pag.note} arrow>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: 'text.secondary' }}>
                                      <VisibilityIcon fontSize="small" />
                                    </Box>
                                  </Tooltip>
                                )}
                              </Box>
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Data: {pag.data || '-'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Metodo: {pag.metodo || '-'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Quota Saggio: {pag.quotaSaggio ? 'Sì' : 'No'} 
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={() => handleRimuoviPagamento(index)}
                              sx={{ color: 'error.main' }}
                            >
                              ×
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </>
              )}
              
              {pagamentiMensili.length === 0 && (
                <Box 
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    bgcolor: 'action.hover', 
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Nessun pagamento mensile aggiunto
                  </Typography>
                </Box>
              )}
            </Box>
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

export default Soci;

