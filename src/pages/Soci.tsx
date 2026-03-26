
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
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';

const MESI_DISPONIBILI = [
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  '1° Trimestre',
  '2° Trimestre',
  '3° Trimestre',
  'Annuale',
  'Vari',
] as const;

// Stesso criterio del Calcolo Preventivo: arrotonda a multipli di 5€
const arrotonda5 = (val: number) => Math.round(val / 5) * 5;

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

  const [receiptPaymentIndex, setReceiptPaymentIndex] = useState<number | null>(null);

  const [openSaggioChart, setOpenSaggioChart] = useState(false);
  const [chartRow, setChartRow] = useState<any | null>(null);

  const mesiDisponibili = MESI_DISPONIBILI;

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

  const socioOptions = useMemo(() => {
    return sociOrdinati.map((socio) => (
      <MenuItem key={socio.id} value={socio.id}>
        {socio.cognome} {socio.nome}
      </MenuItem>
    ));
  }, [sociOrdinati]);

  const mesiOptions = useMemo(() => {
    return mesiDisponibili.map((mese) => (
      <MenuItem key={mese} value={mese}>
        {mese}
      </MenuItem>
    ));
  }, [mesiDisponibili]);

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

  const parsePagamentiRaw = useCallback((pagamentiString: string) => {
    if (!pagamentiString) return [] as { raw: string; mese: string }[];
    return pagamentiString
      .split(';')
      .filter((p) => p.trim())
      .map((raw) => {
        const firstDash = raw.indexOf('-');
        const mese = firstDash >= 0 ? raw.slice(0, firstDash).trim() : (raw.split(':')[0] || '').trim();
        return { raw, mese };
      });
  }, []);

  const getSaggioMultiplierForMese = useCallback((mese: string): number => {
    const m = (mese || '').trim();
    if (!m) return 0;
    if (m === 'Annuale') return 9;
    if (m.includes('Trimestre')) return 3;
    // mesi singoli
    return 1;
  }, []);

  const getQuotaSaggioPagata = useCallback((row: any): { pagata: number; totale: number } => {
    const quotaSaggioNum = (typeof row?.quotaSaggio === 'string' ? parseFloat(row.quotaSaggio) : Number(row?.quotaSaggio)) || 0;
    const totale = quotaSaggioNum > 0 ? quotaSaggioNum * 9 : 0;
    const raw = String(row?.pagamenti || '');
    if (!raw.trim() || quotaSaggioNum <= 0) return { pagata: 0, totale };

    const items = raw.split(';').filter((p: string) => p.trim());
    let pagata = 0;

    for (const item of items) {
      const parts = item.split('-');
      const mese = (parts[0] || '').trim();
      const quotaSaggioFlagStr = (parts[4] || '').trim().toLowerCase();
      const flag = quotaSaggioFlagStr === 'true';
      if (!flag) continue;

      const mult = getSaggioMultiplierForMese(mese);
      pagata += quotaSaggioNum * mult;
    }

    if (!Number.isFinite(pagata) || pagata < 0) pagata = 0;
    if (totale > 0) pagata = Math.min(pagata, totale);
    return { pagata, totale };
  }, [getSaggioMultiplierForMese]);

  const handleOpenSaggioChart = useCallback((row: any) => {
    setChartRow(row);
    setOpenSaggioChart(true);
  }, []);

  const handleCloseSaggioChart = useCallback(() => {
    setOpenSaggioChart(false);
    setChartRow(null);
  }, []);

  const formatReceiptDate = useCallback((d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  const handlePrintReceipt = useCallback((index: number) => {
    if (!form.idSocio) return;
    const rawItems = parsePagamentiRaw(String(form.pagamenti || ''));
    if (rawItems.length === 0) return;
    if (index < 0 || index >= rawItems.length) return;
    setReceiptPaymentIndex(index);

    setTimeout(() => {
      window.print();
    }, 0);
  }, [form.idSocio, form.pagamenti, parsePagamentiRaw]);

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
    const qm = (typeof quotaMensile === 'string' ? parseFloat(quotaMensile) : quotaMensile) || 0;
    const qs = (typeof quotaSaggio === 'string' ? parseFloat(quotaSaggio) : quotaSaggio) || 0;

    // Se non è selezionato alcun periodo, ma Quota Saggio è spuntata,
    // imposta l'importo almeno alla quota saggio (richiesta UX).
    if (!meseSelezionato) {
      if (quotaSaggioFlag && qs > 0) {
        const roundedQs = arrotonda5(qs);
        setImportoPagamento(roundedQs > 0 ? roundedQs.toFixed(2) : '');
      } else {
        setImportoPagamento('');
      }
      return;
    }

    let importoFinale = 0;
    let moltiplicatore = 1;
    if (meseSelezionato === 'Annuale') {
      moltiplicatore = 9;
      importoFinale = (qm * moltiplicatore) - ((qm * 9) / 100 * 15);
    } else if (meseSelezionato.indexOf('Trimestre') !== -1) {
      moltiplicatore = 3;
      importoFinale = (qm * moltiplicatore) - ((qm * 3) / 100 * 10);
    } else if (meseSelezionato === 'Vari') {
      // Importo manuale: non sovrascrivere.
      // Se Quota Saggio è spuntata e l'importo è vuoto, imposta almeno la quota saggio.
      if (quotaSaggioFlag) {
        const current = parseFloat(String(importoPagamento || '').trim());
        if (!importoPagamento || String(importoPagamento).trim() === '' || Number.isNaN(current)) {
          const roundedQs = qs > 0 ? arrotonda5(qs) : 0;
          setImportoPagamento(roundedQs > 0 ? roundedQs.toFixed(2) : '');
        }
      }
      return;
    } else {
      importoFinale = qm;
    }
    if (quotaSaggioFlag) {
      importoFinale = importoFinale + (qs * moltiplicatore);
    }
    const rounded = importoFinale > 0 ? arrotonda5(importoFinale) : 0;
    setImportoPagamento(rounded > 0 ? rounded.toFixed(2) : '');
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
    setReceiptPaymentIndex(null);
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
  }, [meseSelezionato, importoPagamento, metodoPagamento, quotaSaggioFlag, notePagamento]);

  const handleRimuoviPagamento = useCallback((index: number) => {
    setPagamentiMensili(prev => prev.filter((_, i) => i !== index));
  }, []);

  const pagamentiRegistratiContent = useMemo(() => {
    if (pagamentiMensili.length === 0) return null;
    return (
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
                  boxShadow: 1,
                },
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {pag.mese}
                      </Typography>
                      <Tooltip title="Stampa ricevuta" arrow>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handlePrintReceipt(index)}
                            disabled={!form.idSocio || !String(form.pagamenti || '').trim()}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
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
    );
  }, [pagamentiMensili, handleRimuoviPagamento, form.idSocio, form.pagamenti, handlePrintReceipt]);

  const receiptData = useMemo(() => {
    const socioSelezionato = soci.find((s) => s.id === (form.idSocio as string));
    const rawItems = parsePagamentiRaw(String(form.pagamenti || ''));
    const idx = typeof receiptPaymentIndex === 'number' ? receiptPaymentIndex : -1;
    const raw = idx >= 0 && idx < rawItems.length ? rawItems[idx].raw : '';

    const parts = raw ? raw.split('-') : [];
    const mese = (parts[0] || '').trim();
    const importoStr = (parts[1] || '').trim();
    const metodo = (parts[2] || '').trim();
    const quotaNum = importoStr ? Number(importoStr) : 0;

    const receiptNumber = form.idSocio ? `${String(form.idSocio)}${idx + 1}` : '';
    const today = formatReceiptDate(new Date());

    const accademiaDisplay = socioSelezionato?.accademia
      ? socioSelezionato.accademia.split(';').map((c) => c.trim()).filter(Boolean)
      : [];
    const baseDisplay = socioSelezionato?.base
      ? socioSelezionato.base.split(';').map((c) => c.trim()).filter(Boolean)
      : [];
    const corsiDisplay = socioSelezionato?.corsi
      ? socioSelezionato.corsi.split(';').map((c) => c.trim()).filter(Boolean)
      : [];

    return {
      socio: socioSelezionato,
      mese,
      quotaNum: Number.isFinite(quotaNum) ? quotaNum : 0,
      metodo,
      receiptNumber,
      today,
      accademiaDisplay,
      baseDisplay,
      corsiDisplay,
    };
  }, [soci, form.idSocio, form.pagamenti, receiptPaymentIndex, parsePagamentiRaw, formatReceiptDate]);

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
      if (colIdx < annIdx && colIdx > 6) return green;
    }

    // Trimestri: mark months in respective ranges if trimester is filled
    const primoFilled = isFilled(row.primoTrimestre);
    const secondoFilled = isFilled(row.secondoTrimestre);
    const terzoFilled = isFilled(row.terzoTrimestre);

    // Non colorare mai Settembre
    if (primoFilled && ['ottobre','novembre','dicembre'].includes(key)) return green;
    if (secondoFilled && ['gennaio','febbraio','marzo'].includes(key)) return green;
    if (terzoFilled && ['aprile','maggio','giugno'].includes(key)) return green;

    // Mesi: se la cella contiene un dato, colorala di verde (ma mai Settembre)
    const meseKeys = new Set([
      'ottobre',
      'novembre',
      'dicembre',
      'gennaio',
      'febbraio',
      'marzo',
      'aprile',
      'maggio',
      'giugno',
    ]);
    if (meseKeys.has(key) && isFilled(row[key])) return green;

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

  const getFattureRowId = useCallback((row: any) => String(row.idSocio), []);

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
        getRowId={getFattureRowId}
        onEdit={handleOpenDialog}
        onChart={handleOpenSaggioChart}
        emptyMessage="Nessun socio presente"
        renderCell={renderCell}
        getCellSx={getCellSx}
        actionColumnWidth={96}
        getHeadCellSx={getHeadCellSx}
        stringSortLocale="it"
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
              {socioOptions}
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
                      }}
                      sx={{ flex: 1, maxWidth: 242 }}
                      required
                      error={paymentAttempted && !meseSelezionato}
                      helperText={paymentAttempted && !meseSelezionato ? 'Campo obbligatorio' : ''}
                    >
                      {mesiOptions}
                    </TextField>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={quotaSaggioFlag}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const socioSelezionato = soci.find((s) => s.id === (form.idSocio as string));
                              const qsRaw = socioSelezionato ? socioSelezionato.quotaSaggio : 0;
                              const qsNum = (typeof qsRaw === 'string' ? parseFloat(qsRaw) : (qsRaw as any)) || 0;

                              if (checked) {
                                setQuotaSaggioFlag(true);
                                const current = parseFloat(String(importoPagamento || '').trim());
                                if (!importoPagamento || String(importoPagamento).trim() === '' || Number.isNaN(current)) {
                                  const rounded = qsNum > 0 ? arrotonda5(qsNum) : 0;
                                  setImportoPagamento(rounded > 0 ? rounded.toFixed(2) : '');
                                } else {
                                  const next = current + (qsNum > 0 ? qsNum : 0);
                                  setImportoPagamento(next > 0 ? next.toFixed(2) : '');
                                }
                              } else {
                                setQuotaSaggioFlag(false);
                                const current = parseFloat(String(importoPagamento || '').trim());
                                if (!importoPagamento || String(importoPagamento).trim() === '' || Number.isNaN(current)) {
                                  setImportoPagamento('');
                                } else {
                                  const next = Math.max(0, current - (qsNum > 0 ? qsNum : 0));
                                  setImportoPagamento(next > 0 ? next.toFixed(2) : '');
                                }
                              }
                            }}
                          />
                        }
                        label={`Quota Saggio (${quotaSaggioDisplay})`}
                        labelPlacement="end"
                        sx={{ ml: 1 }}
                      />
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
              
              {pagamentiRegistratiContent}
              
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

      <Dialog open={openSaggioChart} onClose={handleCloseSaggioChart} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon fontSize="small" />
          Quota Saggio
        </DialogTitle>
        <DialogContent>
          {(() => {
            const { pagata, totale } = getQuotaSaggioPagata(chartRow);
            const restante = Math.max(0, (totale || 0) - (pagata || 0));
            const denom = (totale || 0) > 0 ? totale : (pagata + restante);
            const greenPct = denom > 0 ? (pagata / denom) * 100 : 0;
            const redPct = Math.max(0, 100 - greenPct);

            return (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Totale previsto: €{(totale || 0).toFixed(2)} (Quota Saggio × 9)
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      Pagata
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      €{(pagata || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                      Restante
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      €{(restante || 0).toFixed(2)}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 1, height: 14, borderRadius: 999, overflow: 'hidden', bgcolor: 'action.hover' }}>
                    <Box sx={{ display: 'flex', height: '100%' }}>
                      <Box sx={{ width: `${greenPct}%`, bgcolor: 'success.main' }} />
                      <Box sx={{ width: `${redPct}%`, bgcolor: 'error.main' }} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaggioChart}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {receiptPaymentIndex !== null && (
        <Box className="print-receipt" sx={{ display: 'none' }}>
          <Box sx={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ fontSize: '28px', fontWeight: 800, letterSpacing: 1 }}>
                  RICEVUTA
                </Typography>
                <Typography sx={{ fontSize: '10px', mt: 0.5 }}>
                  PER CORSI ED ATTIVITA' EXTRA SCOLASTICHE A CARATTERE DIDATTICO E FORMATIVO
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 4 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>
                  CENTRO STUDI DANZA CLASSICA a.c.s.d.
                </Typography>
                <Typography sx={{ fontSize: '12px' }}>Via di Monteverde, 7/G</Typography>
                <Typography sx={{ fontSize: '12px' }}>00152 - Roma (RM)</Typography>
                <Typography sx={{ fontSize: '12px' }}>P.IVA 05373771004</Typography>
                <Typography sx={{ fontSize: '12px' }}>06 535409 / 388 1858282</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>DATA</Typography>
                <Typography sx={{ fontSize: '12px', textAlign: 'right', fontWeight: 700 }}>{receiptData.today}</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>RICEVUTA N°</Typography>
                <Typography sx={{ fontSize: '12px', textAlign: 'right', fontWeight: 700 }}>{receiptData.receiptNumber}</Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 4 }}>
              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 800, mb: 1 }}>DATI DEL SOCIO</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 0.75 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>COGNOME</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{receiptData.socio?.cognome || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>NOME</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{receiptData.socio?.nome || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>C.F.</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.codFiscale || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>INDIRIZZO</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.indirizzo || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>CITTA'</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.citta || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>TELEFONO</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.telefono || ''}</Typography>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 800, mb: 1 }}>GENITORE (se minorenne)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 0.75 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>COGNOME</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.cognomeGenitore || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>NOME</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.nomeGenitore || ''}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>C.F.</Typography>
                  <Typography sx={{ fontSize: '11px' }}>{(receiptData.socio as any)?.codFiscaleGenitore || ''}</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
              {/* TABELLE */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {!!receiptData.accademiaDisplay.length && (
                  <Box sx={{ border: '1px solid #000' }}>
                    <Box sx={{ borderBottom: '1px solid #000', px: 1, py: 0.5, bgcolor: '#f2f2f2' }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>ACCADEMIA</Typography>
                    </Box>
                    <Box>
                      {receiptData.accademiaDisplay.map((c: string, i: number) => (
                        <Box
                          key={`acc-${i}`}
                          sx={{
                            borderBottom: i === receiptData.accademiaDisplay.length - 1 ? 'none' : '1px solid #000',
                            px: 1,
                            py: 0.55,
                            minHeight: '22px',
                          }}
                        >
                          <Typography sx={{ fontSize: '11px' }}>{c}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {!!receiptData.baseDisplay.length && (
                  <Box sx={{ border: '1px solid #000' }}>
                    <Box sx={{ borderBottom: '1px solid #000', px: 1, py: 0.5, bgcolor: '#f2f2f2' }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>BASE</Typography>
                    </Box>
                    <Box>
                      {receiptData.baseDisplay.map((c: string, i: number) => (
                        <Box
                          key={`base-${i}`}
                          sx={{
                            borderBottom: i === receiptData.baseDisplay.length - 1 ? 'none' : '1px solid #000',
                            px: 1,
                            py: 0.55,
                            minHeight: '22px',
                          }}
                        >
                          <Typography sx={{ fontSize: '11px' }}>{c}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {!!receiptData.corsiDisplay.length && (
                  <Box sx={{ border: '1px solid #000' }}>
                    <Box sx={{ borderBottom: '1px solid #000', px: 1, py: 0.5, bgcolor: '#f2f2f2' }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>CORSI</Typography>
                    </Box>
                    <Box>
                      {receiptData.corsiDisplay.map((c: string, i: number) => (
                        <Box
                          key={`corso-${i}`}
                          sx={{
                            borderBottom: i === receiptData.corsiDisplay.length - 1 ? 'none' : '1px solid #000',
                            px: 1,
                            py: 0.55,
                            minHeight: '22px',
                          }}
                        >
                          <Typography sx={{ fontSize: '11px' }}>{c}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* QUOTA / PAGAMENTO (a capo) */}
              <Box sx={{ mt: 5, display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: '420px' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 90px 20px 30px', rowGap: 1 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>QUOTA</Typography>
                  <Typography sx={{ fontSize: '12px' }} />
                  <Typography sx={{ fontSize: '12px' }} />
                  <Typography sx={{ fontSize: '12px' }} />

                  <Typography sx={{ fontSize: '12px' }} />
                  <Typography sx={{ fontSize: '12px', textAlign: 'right' }}>{receiptData.quotaNum ? receiptData.quotaNum.toFixed(2) : '0'}</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'center' }}>-</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'right' }}>€</Typography>

                  <Typography sx={{ fontSize: '12px' }}>(Q.S.)</Typography>
                  <Typography />
                  <Typography />
                  <Typography />

                  <Typography sx={{ fontSize: '12px' }}>MESE DI RIFERIMENTO</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'right', fontWeight: 700 }}>{(receiptData.mese || '').toUpperCase()}</Typography>
                  <Typography />
                  <Typography />

                  <Typography sx={{ fontSize: '12px' }}>MODALITA' DI PAGAMENTO</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'right', fontWeight: 700 }}>{(receiptData.metodo || '').toUpperCase()}</Typography>
                  <Typography />
                  <Typography />
                </Box>

                <Divider sx={{ my: 2, borderColor: '#000' }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 90px 20px 30px' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 900 }}>TOTALE</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'right', fontWeight: 900 }}>{receiptData.quotaNum ? receiptData.quotaNum.toFixed(2) : '0'}</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'center', fontWeight: 900 }}>-</Typography>
                  <Typography sx={{ fontSize: '12px', textAlign: 'right', fontWeight: 900 }}>€</Typography>
                </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>
                A.C.S.D. CENTRO STUDI DANZA CLASSICA
              </Typography>
              <Typography sx={{ fontSize: '12px' }}>Via di Monteverde, 7/G</Typography>
              <Typography sx={{ fontSize: '12px' }}>00152 Roma</Typography>
              <Typography sx={{ fontSize: '12px', fontWeight: 800 }}>
                C.F. e P. IVA 05373771004
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .print-receipt,
            .print-receipt * {
              visibility: visible !important;
            }
            .print-receipt {
              display: block !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 16px !important;
              background: white !important;
            }
            @page {
              margin: 0.7cm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default Soci;

