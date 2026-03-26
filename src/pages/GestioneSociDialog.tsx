import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Stack,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Chip,
    Box,
    Typography,
    CircularProgress,
    InputAdornment,
    IconButton
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import ClearIcon from '@mui/icons-material/Clear';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import SuccessDialog from '../components/SuccessDialog';
import { logOperation } from '../utils/logs';
import { parseListTokens } from '../utils/listTokens';

// Converte una data da formato dd/mm/yyyy a yyyy-MM-dd per gli input type="date"
const normalizeDateForInput = (value?: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';

    // yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // ISO datetime: yyyy-MM-ddTHH:mm:ss... -> yyyy-MM-dd
    const isoDateTimeMatch = /^(\d{4}-\d{2}-\d{2})T/.exec(trimmed);
    if (isoDateTimeMatch) return isoDateTimeMatch[1];

    // dd/mm/yyyy
    const italianMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (italianMatch) {
        const [, dd, mm, yyyy] = italianMatch;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    // Qualsiasi altro formato può risultare "non valido" per i browser (Safari incluso)
    return '';
};

// Converte una data da formato yyyy-MM-dd a dd/mm/yyyy per il salvataggio su Supabase
const formatDateForSave = (value?: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

    const isoDateTimeMatch = /^(\d{4}-\d{2}-\d{2})T/.exec(trimmed);
    const dateOnly = isoDateTimeMatch ? isoDateTimeMatch[1] : trimmed;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        const [yyyy, mm, dd] = dateOnly.split('-');
        return `${dd}/${mm}/${yyyy}`;
    }

    return '';
};

const AnagraficaFields = ({ form, handleField, errors, dateInputKeys, clearDateField }: any) => (
    <>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 1, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>Anagrafica</Typography>
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Nome" sx={{ flex: 1 }} value={form.nome || ''} onChange={e => handleField('nome', e.target.value)} error={!!errors.nome} helperText={errors.nome} />
                <TextField label="Cognome" sx={{ flex: 1 }} value={form.cognome || ''} onChange={e => handleField('cognome', e.target.value)} error={!!errors.cognome} helperText={errors.cognome} />
                <TextField label="Cod. Fiscale" sx={{ flex: 1 }} value={form.codFiscale || ''} onChange={e => handleField('codFiscale', e.target.value)} error={!!errors.codFiscale} helperText={errors.codFiscale} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    key={`dataNascita-${dateInputKeys?.dataNascita ?? 0}`}
                    label="Data Nascita"
                    type="date"
                    sx={{ flex: 1 }}
                    value={form.dataNascita ?? ''}
                    onChange={e => handleField('dataNascita', e.target.value)}
                    autoComplete="off"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    aria-label="Svuota data"
                                    edge="start"
                                    size="small"
                                    onClick={() => (clearDateField ? clearDateField('dataNascita') : handleField('dataNascita', ''))}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    error={!!errors.dataNascita}
                    helperText={errors.dataNascita}
                />
                <TextField label="Luogo di Nascita" sx={{ flex: 1 }} value={form.luogoNascita || ''} onChange={e => handleField('luogoNascita', e.target.value)} error={!!errors.luogoNascita} helperText={errors.luogoNascita} />
                <TextField label="Prov. di Nascita" sx={{ flex: 1 }} value={form.provinciaNascita || ''} onChange={e => handleField('provinciaNascita', e.target.value)} inputProps={{ maxLength: 2 }} error={!!errors.provinciaNascita} helperText={errors.provinciaNascita} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Indirizzo di Residenza" sx={{ flex: 1 }} value={form.indirizzo || ''} onChange={e => handleField('indirizzo', e.target.value)} error={!!errors.indirizzo} helperText={errors.indirizzo} />
                <TextField label="Città di Residenza" sx={{ flex: 1 }} value={form.residenza || ''} onChange={e => handleField('residenza', e.target.value)} error={!!errors.residenza} helperText={errors.residenza} />
                <TextField label="Prov. di Residenza" sx={{ flex: 1 }} value={form.provinciaResidenza || ''} onChange={e => handleField('provinciaResidenza', e.target.value)} inputProps={{ maxLength: 2 }} error={!!errors.provinciaResidenza} helperText={errors.provinciaResidenza} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Telefono" fullWidth value={form.telefono || ''} onChange={e => handleField('telefono', e.target.value)} error={!!errors.telefono} helperText={errors.telefono} />
                <TextField label="Email" type="email" fullWidth value={form.email || ''} onChange={e => handleField('email', e.target.value)} error={!!errors.email} helperText={errors.email} />
            </Box>
        </Stack>
    </>
);

const IscrizioneFields = ({ form, handleField, nomiCorsiOrdinati = [], pacchettiOrdinati = [], categorie = [], corsi = [], accademia = [], errors = {}, dateInputKeys, clearDateField }: any) => (
    <>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 2, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>Iscrizione</Typography>
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControlLabel control={<Checkbox checked={form.iscrizione === true} onChange={e => handleField('iscrizione', e.target.checked)} />} label="Iscrizione" labelPlacement="start" />
                <FormControlLabel control={<Checkbox checked={form.modulo === true} onChange={e => handleField('modulo', e.target.checked)} />} label="Modulo" labelPlacement="start" />
                <FormControlLabel control={<Checkbox checked={form.agonistico === true} onChange={e => handleField('agonistico', e.target.checked)} />} label="Agonistico" labelPlacement="start" />
                <FormControlLabel control={<Checkbox checked={form.sospeso === true} onChange={e => handleField('sospeso', e.target.checked)} />} label="Sospeso" labelPlacement="start" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    key={`dataIscrizione-${dateInputKeys?.dataIscrizione ?? 0}`}
                    label="Data Iscrizione"
                    type="date"
                    sx={{ flex: 1 }}
                    value={form.dataIscrizione ?? ''}
                    onChange={e => handleField('dataIscrizione', e.target.value)}
                    autoComplete="off"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    aria-label="Svuota data"
                                    edge="start"
                                    size="small"
                                    onClick={() => (clearDateField ? clearDateField('dataIscrizione') : handleField('dataIscrizione', ''))}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    error={!!errors.dataIscrizione}
                    helperText={errors.dataIscrizione}
                />
                <TextField
                    key={`scadenzaTessera-${dateInputKeys?.scadenzaTessera ?? 0}`}
                    label="Scadenza Tessera"
                    type="date"
                    sx={{ flex: 1 }}
                    value={form.scadenzaTessera ?? ''}
                    onChange={e => handleField('scadenzaTessera', e.target.value)}
                    autoComplete="off"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    aria-label="Svuota data"
                                    edge="start"
                                    size="small"
                                    onClick={() => (clearDateField ? clearDateField('scadenzaTessera') : handleField('scadenzaTessera', ''))}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    error={!!errors.scadenzaTessera}
                    helperText={errors.scadenzaTessera}
                />
                <TextField
                    key={`scadenzaCertificato-${dateInputKeys?.scadenzaCertificato ?? 0}`}
                    label="Scadenza Certificato"
                    type="date"
                    sx={{ flex: 1 }}
                    value={form.scadenzaCertificato ?? ''}
                    onChange={e => handleField('scadenzaCertificato', e.target.value)}
                    autoComplete="off"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    aria-label="Svuota data"
                                    edge="start"
                                    size="small"
                                    onClick={() => (clearDateField ? clearDateField('scadenzaCertificato') : handleField('scadenzaCertificato', ''))}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    error={!!errors.scadenzaCertificato}
                    helperText={errors.scadenzaCertificato}
                />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Quota Iscrizione €" type="number" sx={{ flex: 1 }} value={form.quotaIscrizione || ''} onChange={e => handleField('quotaIscrizione', e.target.value)} />
                <TextField label="Quota Mensile €" type="number" sx={{ flex: 1 }} value={form.quotaMensile || ''} onChange={e => handleField('quotaMensile', e.target.value)} />
                <TextField label="Quota Saggio €" type="number" sx={{ flex: 1 }} value={form.quotaSaggio || ''} onChange={e => handleField('quotaSaggio', e.target.value)} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                    select
                    label="Base"
                    sx={{ flex: 1 }}
                    value={form.base || ''}
                    onChange={e => handleField('base', e.target.value)}
                >
                    <MenuItem value="">
                        <em>Nesuno</em>
                    </MenuItem>
                    {nomiCorsiOrdinati.map((nomeCorso: string) => {
                        // Trova la categoria del corso
                        const corsoObj = corsi?.find((c: any) => c.nomeCorso === nomeCorso);
                        const corsoCat = corsoObj ? categorie?.find((cat: any) => cat.categoria === corsoObj.categoria) : null;
                        return (
                            <MenuItem key={nomeCorso} value={nomeCorso}>
                                <Box sx={{ px: 1, py: 0.5, borderRadius: 1, backgroundColor: (corsoCat?.colore ? corsoCat.colore + '40' : '#e3f2fd'), display: 'inline-block' }}>{nomeCorso}</Box>
                            </MenuItem>
                        );
                    })}
                </TextField>
                <TextField
                    select
                    label="Accademia"
                    sx={{ flex: 1 }}
                    value={form.accademia || ''}
                    onChange={e => handleField('accademia', e.target.value)}
                >
                    <MenuItem value="">
                        <em>Nesuno</em>
                    </MenuItem>
                    {pacchettiOrdinati.map((pacchetto: string) => {
                        const pacchettoObj = accademia?.find((a: any) => a.pacchetto === pacchetto);
                        const pacchettoCat = pacchettoObj ? categorie?.find((cat: any) => cat.categoria === pacchettoObj.categoria) : null;
                        const corsiTooltip = parseListTokens(pacchettoObj?.corsi);
                        return (
                            <MenuItem key={pacchetto} value={pacchetto}>
                                <Tooltip
                                    arrow
                                    placement="right"
                                    enterDelay={250}
                                    title={corsiTooltip.length ? corsiTooltip.join('\n') : ''}
                                    componentsProps={{
                                        tooltip: {
                                            sx: {
                                                whiteSpace: 'pre-line',
                                                maxWidth: 380,
                                            },
                                        },
                                    }}
                                    disableHoverListener={!corsiTooltip.length}
                                >
                                    <Box sx={{ px: 1, py: 0.5, borderRadius: 1, backgroundColor: (pacchettoCat?.colore ? pacchettoCat.colore + '40' : '#e3f2fd'), display: 'inline-block' }}>{pacchetto}</Box>
                                </Tooltip>
                            </MenuItem>
                        );
                    })}
                </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                
                <TextField
                    select
                    label="Corsi"
                    sx={{ flex: 1 }}
                    value={Array.isArray(form.corsi) ? form.corsi : (form.corsi ? String(form.corsi).split(';').filter(Boolean) : [])}
                    onChange={e => {
                        const value = e.target.value;
                        // Salva come stringa separata da ;
                        handleField('corsi', Array.isArray(value) ? value.join(';') : value);
                    }}
                    SelectProps={{
                         autoWidth: true,
                MenuProps: {
                  PaperProps: {
                    sx: { width: 550, maxWidth: 550 },
                  },
                },
                        multiple: true,
                        renderValue: (selected: unknown) => {
                            const values = Array.isArray(selected) ? selected as string[] : [];
                            return (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {values.map((value) => (
                                        <Chip key={value} label={value} size="small" />
                                    ))}
                                </Box>
                            );
                        }
                    }}
                >
                    {nomiCorsiOrdinati.map((nomeCorso: string) => {
                        // Trova la categoria del corso
                        const corsoObj = corsi?.find((c: any) => c.nomeCorso === nomeCorso);
                        const corsoCat = corsoObj ? categorie?.find((cat: any) => cat.categoria === corsoObj.categoria) : null;
                        const selected = Array.isArray(form.corsi)
                            ? form.corsi.includes(nomeCorso)
                            : (form.corsi ? String(form.corsi).split(';').includes(nomeCorso) : false);
                        return (
                            <MenuItem key={nomeCorso} value={nomeCorso}>
                                <Checkbox checked={selected} sx={{ mr: 1 }} />
                                <Box sx={{ px: 1, py: 0.5, borderRadius: 1, backgroundColor: (corsoCat?.colore ? corsoCat.colore + '40' : '#e3f2fd'), display: 'inline-block' }}>{nomeCorso}</Box>
                            </MenuItem>
                        );
                    })}
                </TextField>
            </Box>
        </Stack>
    </>
);

const GenitoreFields = ({ form, handleField }: any) => (
    <>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 2, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>Dati Genitore</Typography>
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Nome Genitore" fullWidth value={form.nomeGenitore || ''} onChange={e => handleField('nomeGenitore', e.target.value)} />
                <TextField label="Cognome Genitore" fullWidth value={form.cognomeGenitore || ''} onChange={e => handleField('cognomeGenitore', e.target.value)} />
                <TextField label="Cod. Fiscale Genitore" fullWidth value={form.codFiscaleGenitore || ''} onChange={e => handleField('codFiscaleGenitore', e.target.value)} />
            </Box>
        </Stack>
    </>
);

const NoteFields = ({ form, handleField }: any) => (
    <>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 2, pb: 1, borderBottom: 2, borderColor: 'primary.main' }}>Note</Typography>
        <Stack spacing={2}>
            <TextField label="Note" multiline rows={3} fullWidth value={form.note || ''} onChange={e => handleField('note', e.target.value)} />
        </Stack>
    </>
);

const SocioFormDialog = ({ open, onClose, initialForm, onSave, editingSocio, createSocio, updateSocio }: any) => {
    const { profile } = require('../contexts/AuthContext').useAuth();
    const userName = profile?.userName || 'unknown';
    const [form, setForm] = useState<any>(initialForm || {});
    const [dateInputKeys, setDateInputKeys] = useState<Record<string, number>>({
        dataNascita: 0,
        dataIscrizione: 0,
        scadenzaTessera: 0,
        scadenzaCertificato: 0,
    });
    const { data: corsi } = require('../hooks/useSupabaseData').useSupabaseData('Corsi');
    const { data: categorie } = require('../hooks/useSupabaseData').useSupabaseData('CategorieCorsi');
    const { data: accademia } = require('../hooks/useSupabaseData').useSupabaseData('Accademia');
    const { errors, validate, setError, clearAllErrors } = useFormValidation();
    const [showErrors, setShowErrors] = useState(false);
    const [loading, setLoading] = useState(false);
    const [openSuccess, setOpenSuccess] = useState(false);

    useEffect(() => {
        if (open) {
            const baseForm = initialForm || {};
            const normalizedForm = {
                ...baseForm,
                dataNascita: normalizeDateForInput(baseForm.dataNascita),
                dataIscrizione: normalizeDateForInput(baseForm.dataIscrizione),
                scadenzaTessera: normalizeDateForInput(baseForm.scadenzaTessera),
                scadenzaCertificato: normalizeDateForInput(baseForm.scadenzaCertificato),
            };
            setForm(normalizedForm);
            clearAllErrors();
            setShowErrors(false);
        }
    }, [open, initialForm, clearAllErrors]);

    const nomiCorsiOrdinati = useMemo(() => {
        if (!corsi) return [];
        const corsiOrdinati = [...corsi].sort((a: any, b: any) => {
            const categoriaCompare = a.categoria.localeCompare(b.categoria);
            if (categoriaCompare !== 0) return categoriaCompare;
            return a.nomeCorso.localeCompare(b.nomeCorso);
        });
        return Array.from(new Set(corsiOrdinati.map((c: any) => c.nomeCorso)));
    }, [corsi]);

    const pacchettiOrdinati = useMemo(() => {
        if (!accademia) return [];
        const accademiaOrdinata = [...accademia].sort((a: any, b: any) => {
            const categoriaCompare = (a.categoria || '').localeCompare(b.categoria || '');
            if (categoriaCompare !== 0) return categoriaCompare;
            return (a.pacchetto || '').localeCompare(b.pacchetto || '');
        });
        return Array.from(new Set(accademiaOrdinata.map((a: any) => a.pacchetto).filter(Boolean)));
    }, [accademia]);
    const handleField = useCallback((field: string, value: any) => {
        setForm((prev: Record<string, any>) => {
            // Base e Accademia sono mutuamente esclusivi: se ne scelgo uno, l'altro va azzerato.
            if (field === 'base') {
                return {
                    ...prev,
                    base: value,
                    ...(value ? { accademia: '' } : null),
                };
            }
            if (field === 'accademia') {
                return {
                    ...prev,
                    accademia: value,
                    ...(value ? { base: '' } : null),
                };
            }

            return { ...prev, [field]: value };
        });
    }, []);

    const clearDateField = useCallback((field: string) => {
        setForm((prev: Record<string, any>) => ({ ...prev, [field]: '' }));
        setDateInputKeys((prev) => ({ ...prev, [field]: (prev[field] ?? 0) + 1 }));
    }, []);


    // Regole di validazione per i campi anagrafici e principali
    const anagraficaRules = {
        nome: { required: true, message: 'Il nome è obbligatorio' },
        cognome: { required: true, message: 'Il cognome è obbligatorio' },
        codFiscale: { required: true, message: 'Il codice fiscale è obbligatorio' },
        dataNascita: {
            required: true,
            message: 'La data di nascita è obbligatoria e non può essere nel futuro',
            customValidation: (value: string) => {
                if (!value) return false;
                const today = new Date().toISOString().slice(0, 10);
                return value <= today;
            }
        },
        luogoNascita: { required: true, message: 'Il luogo di nascita è obbligatorio' },
        provinciaNascita: { required: true, message: 'La provincia di nascita è obbligatoria' },
        indirizzo: { required: true, message: 'L’indirizzo di residenza è obbligatorio' },
        residenza: { required: true, message: 'La città di residenza è obbligatoria' },
        provinciaResidenza: { required: true, message: 'La provincia di residenza è obbligatoria' },
    };

    const handleSave = useCallback(async () => {
        setShowErrors(true);
        if (!validate(form, anagraficaRules)) return;
        setLoading(true);
        const selectedAccademia = (form.accademia || '').toString().trim();
        const accademiaObj = selectedAccademia
            ? accademia?.find((a: any) => String(a.pacchetto || '') === selectedAccademia)
            : null;
        const corsiAccademia = accademiaObj?.corsi ? parseListTokens(accademiaObj.corsi) : [];

        const corsiSelezionati = Array.isArray(form.corsi)
            ? form.corsi
            : (typeof form.corsi === 'string' ? parseListTokens(form.corsi) : []);

        const corsiAggiuntiviPuliti = selectedAccademia
            ? corsiSelezionati.filter((c: string) => !corsiAccademia.includes(c))
            : corsiSelezionati;
        const formToSave = {
            ...form,
            dataNascita: formatDateForSave(form.dataNascita),
            dataIscrizione: formatDateForSave(form.dataIscrizione),
            scadenzaTessera: formatDateForSave(form.scadenzaTessera),
            scadenzaCertificato: formatDateForSave(form.scadenzaCertificato),
            quotaIscrizione: Number(form.quotaIscrizione) || 0,
            quotaSaggio: Number(form.quotaSaggio) || 0,
            quotaMensile: Number(form.quotaMensile) || 0,
            // Se è selezionata un'accademia: i corsi del pacchetto vanno salvati in 'base' (separati da ';').
            // Il campo 'corsi' resta disponibile per i corsi aggiuntivi selezionati manualmente.
            base: selectedAccademia ? corsiAccademia.join(';') : form.base,
            corsi: corsiAggiuntiviPuliti.join(';'),
        };
        let result;
        const isUpdate = !!(editingSocio && editingSocio.id);
        if (isUpdate) {
            result = await updateSocio(editingSocio.id, formToSave);
        } else {
            result = await createSocio(formToSave);
        }
        setLoading(false);
        if (!result.success && result.error?.code === '23505') {
            const errorMessage = result.error.message || '';
            if (errorMessage.includes('codFiscale')) {
                setError('codFiscale', 'Codice fiscale già presente nella lista dei Soci');
                return;
            }
        }
        if (result.success) {
            const elemento = `${form.cognome || ''} ${form.nome || ''}`.trim();
            const tipoOperazione = isUpdate ? 'Modifica' : 'Creazione';
            logOperation({
                utente: userName || 'Unknown',
                tipoOperazione,
                lista: 'Soci',
                elemento,
            }).catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Errore durante la scrittura del log:', error);
            });
            if (onSave) onSave(formToSave);
            onClose();
            setShowErrors(false);
            setOpenSuccess(true);
        }
    }, [form, onSave, onClose, validate, editingSocio, createSocio, updateSocio, setError, userName]);

    return (
        <>
            <Dialog open={open} onClose={() => { onClose(); setShowErrors(false); }} maxWidth="md" fullWidth>
                <DialogTitle>Nuovo Socio</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <AnagraficaFields form={form} handleField={handleField} errors={showErrors ? errors : {}} dateInputKeys={dateInputKeys} clearDateField={clearDateField} />
                        <IscrizioneFields form={form} handleField={handleField} nomiCorsiOrdinati={nomiCorsiOrdinati} pacchettiOrdinati={pacchettiOrdinati} categorie={categorie} corsi={corsi} accademia={accademia} errors={showErrors ? errors : {}} dateInputKeys={dateInputKeys} clearDateField={clearDateField} />
                        <GenitoreFields form={form} handleField={handleField} />
                        <NoteFields form={form} handleField={handleField} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { onClose(); setShowErrors(false); }}>Annulla</Button>
                    <Button variant="contained" onClick={handleSave} disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Salva'}
                    </Button>
                </DialogActions>
            </Dialog>
            <SuccessDialog
                open={openSuccess}
                onClose={() => setOpenSuccess(false)}
            />
        </>
    );
};

export default SocioFormDialog;