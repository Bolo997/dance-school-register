
import React, { useState, useMemo, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import SuccessDialog from '../components/SuccessDialog';
import { Fattura, Socio } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { ERROR_MESSAGES } from '../constants';

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
  
  // Stato per i pagamenti mensili
  const [meseSelezionato, setMeseSelezionato] = useState('');
  const [importoPagamento, setImportoPagamento] = useState('');
  const [pagamentiMensili, setPagamentiMensili] = useState<{mese: string, importo: number}[]>([]);

  const mesiDisponibili = [
    'Settembre', 'Ottobre', 'Novembre', 'Dicembre', 
    'Gennaio', 'Febbraio', 'Marzo', 
    'Aprile', 'Maggio', 'Giugno'
  ];

  // Combina i dati dei soci con le fatture
  const fattureConSoci = useMemo(() => {
    return soci.map(socio => {
      const fattura = fatture.find(f => f.idSocio === socio.id);
      
      // Parsing dei pagamenti dal campo pagamenti
      const pagamentiMap: { [key: string]: number } = {};
      if (fattura?.pagamenti) {
        fattura.pagamenti.split(';').filter(p => p.trim()).forEach(item => {
          const [mese, importo] = item.split(':');
          if (mese && importo) {
            pagamentiMap[mese.trim()] = parseFloat(importo) || 0;
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
        quotaSaggio: socio.quotaSaggio || '',
        settembre: pagamentiMap['Settembre'] || 0,
        ottobre: pagamentiMap['Ottobre'] || 0,
        novembre: pagamentiMap['Novembre'] || 0,
        dicembre: pagamentiMap['Dicembre'] || 0,
        gennaio: pagamentiMap['Gennaio'] || 0,
        febbraio: pagamentiMap['Febbraio'] || 0,
        marzo: pagamentiMap['Marzo'] || 0,
        aprile: pagamentiMap['Aprile'] || 0,
        maggio: pagamentiMap['Maggio'] || 0,
        giugno: pagamentiMap['Giugno'] || 0,
        pagamenti: fattura?.pagamenti || '',
        creato: fattura?.creato || '',
        modificato: fattura?.modificato,
        _hasFattura: !!fattura
      };
    });
  }, [soci, fatture]);

  const parsePagamenti = useCallback((pagamentiString: string) => {
    if (!pagamentiString) {
      setPagamentiMensili([]);
      return;
    }
    const parsed = pagamentiString.split(';').filter(p => p.trim()).map(item => {
      const [mese, importo] = item.split(':');
      return { mese: mese.trim(), importo: parseFloat(importo) || 0 };
    });
    setPagamentiMensili(parsed);
  }, []);

  const handleOpenDialog = useCallback((row?: any) => {
    if (row) {
      setEditingFattura(row._hasFattura ? { ...row } : null);
      setForm({
        idSocio: row.idSocio,
        pagamenti: row.pagamenti
      });
      parsePagamenti(row.pagamenti || '');
    } else {
      setEditingFattura(null);
      setForm({});
      setPagamentiMensili([]);
    }
    setMeseSelezionato('');
    setImportoPagamento('');
    clearAllErrors();
    setOpenDialog(true);
  }, [clearAllErrors, parsePagamenti]);

  const serializePagamenti = useCallback((pagamenti: {mese: string, importo: number}[]) => {
    return pagamenti.map(p => `${p.mese}:${p.importo.toFixed(2)}`).join(';');
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingFattura(null);
    setForm({});
    setPagamentiMensili([]);
    setMeseSelezionato('');
    setImportoPagamento('');
    clearAllErrors();
  }, [clearAllErrors]);

  const handleAggiungiPagamento = useCallback(() => {
    if (!meseSelezionato || !importoPagamento || parseFloat(importoPagamento) <= 0) {
      return;
    }
    
    const meseEsistente = pagamentiMensili.find(p => p.mese === meseSelezionato);
    if (meseEsistente) {
      setPagamentiMensili(prev => 
        prev.map(p => p.mese === meseSelezionato 
          ? { ...p, importo: parseFloat(importoPagamento) } 
          : p
        )
      );
    } else {
      setPagamentiMensili(prev => [...prev, { 
        mese: meseSelezionato, 
        importo: parseFloat(importoPagamento) 
      }]);
    }
    
    setMeseSelezionato('');
    setImportoPagamento('');
  }, [meseSelezionato, importoPagamento, pagamentiMensili]);

  const handleRimuoviPagamento = useCallback((mese: string) => {
    setPagamentiMensili(prev => prev.filter(p => p.mese !== mese));
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
    if (editingFattura && editingFattura.id) {
      result = await updateFattura(editingFattura.id, fatturaData);
    } else {
      result = await createFattura(fatturaData);
    }
    
    if (result.success) {
      handleCloseDialog();
      setOpenSuccess(true);
    }
    setLoading(false);
  };



  const fattureColumns = [
    { key: 'nome', label: 'Nome', width: '150px' },
    { key: 'cognome', label: 'Cognome', width: '150px' },
    { key: 'quotaIscrizione', label: 'Quota Iscrizione', width: '8%', format: (val: string) => val ? `€${val}` : '' },
    { key: 'quotaMensile', label: 'Quota Mensile', width: '8%', format: (val: string) => val ? `€${val}` : '' },
    { key: 'quotaSaggio', label: 'Quota Saggio', width: '8%', format: (val: string) => val ? `€${val}` : '' },
    { key: 'settembre', label: 'Settembre', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'ottobre', label: 'Ottobre', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'novembre', label: 'Novembre', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'dicembre', label: 'Dicembre', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'gennaio', label: 'Gennaio', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'febbraio', label: 'Febbraio', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'marzo', label: 'Marzo', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'aprile', label: 'Aprile', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'maggio', label: 'Maggio', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
    { key: 'giugno', label: 'Giugno', width: '8%', format: (val: number) => val ? `€${val.toFixed(2)}` : '' },
  ];

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
      />

      <SuccessDialog
        open={openSuccess}
        onClose={() => setOpenSuccess(false)}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFattura ? 'Modifica Fattura' : 'Nuova Fattura'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Nome e Cognome"
              fullWidth
              value={form.idSocio || ''}
              onChange={(e) => handleChange('idSocio', e.target.value)}
              error={!!errors.idSocio}
              helperText={errors.idSocio}
            >
              {soci.map((socio) => (
                <MenuItem key={socio.id} value={socio.id}>
                  {socio.cognome} {socio.nome}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Pagamenti Mensili
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2, bgcolor: 'background.default' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Aggiungi un nuovo pagamento mensile
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      select
                      label="Mese"
                      size="small"
                      value={meseSelezionato}
                      onChange={(e) => setMeseSelezionato(e.target.value)}
                      sx={{ flex: 1 }}
                    >
                      {mesiDisponibili.map((mese) => (
                        <MenuItem key={mese} value={mese}>
                          {mese}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Importo €"
                      type="number"
                      size="small"
                      value={importoPagamento}
                      onChange={(e) => setImportoPagamento(e.target.value)}
                      inputProps={{ step: '0.01', min: '0' }}
                      sx={{ flex: 1 }}
                    />
                    <Button 
                      variant="contained"
                      onClick={handleAggiungiPagamento}
                      disabled={!meseSelezionato || !importoPagamento}
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                    {pagamentiMensili.map((pag) => (
                      <Card 
                        key={pag.mese}
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
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {pag.mese}
                              </Typography>
                              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                                €{pag.importo.toFixed(2)}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={() => handleRimuoviPagamento(pag.mese)}
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

