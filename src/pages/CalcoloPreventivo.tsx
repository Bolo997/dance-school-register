import React, { useState, useMemo } from 'react';
import { Button } from '@mui/material';
import { TextField, MenuItem, Box, Typography, IconButton, Stack, Card, CardContent, Divider, Avatar, Checkbox, FormControlLabel, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { TipoIscrizione, Corso, ImportoPreventivo, Socio } from '../types';
import GestioneSociDialog from './GestioneSociDialog';

const CalcoloPreventivo: React.FC = () => {
		const { profile } = require('../contexts/AuthContext').useAuth();
	const { data: importiPreventivo = [] } = useSupabaseData<ImportoPreventivo>('ImportiPreventivo');
	const [checkedExtras, setCheckedExtras] = useState<boolean[]>([false, false, false, false]);
	const [checkedQuotaSaggio, setCheckedQuotaSaggio] = useState<boolean>(false);

	const extraImporti = importiPreventivo.slice(0, 4);

	const handleCheckExtra = (idx: number) => {
		setCheckedExtras(prev => prev.map((v, i) => i === idx ? !v : v));
	};

	const { data: tipiIscrizione = [] } = useSupabaseData<TipoIscrizione>('TipoIscrizione');
	const { data: corsi = [] } = useSupabaseData<Corso>('Corsi');
	const { data: categorie = [] } = useSupabaseData<any>('CategorieCorsi');
	const { data: soci = [], create: createSocio, update: updateSocio } = useSupabaseData<Socio>('Soci');
	const [selectedTipo, setSelectedTipo] = useState<string>('');
	const [selectedCorsoBase, setSelectedCorsoBase] = useState<string>('');
	const [selectedCorsoAggiuntivo, setSelectedCorsoAggiuntivo] = useState<string>('');
	const [selectedCorsi, setSelectedCorsi] = useState<string[]>([]);
	const [scontiCorsi, setScontiCorsi] = useState<Record<string, string>>({});
    const [selectedSocioId, setSelectedSocioId] = useState<string>('');
	const [openSocioDialog, setOpenSocioDialog] = useState(false);
	const [formSocio, setFormSocio] = useState<any>({});
    const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

	// Helpers
	const tipoValue = useMemo(() => tipiIscrizione.find(t => t.id === selectedTipo)?.value || '', [selectedTipo, tipiIscrizione]);
	// Ordina corsi per categoria, poi nomeCorso
	const sortedCorsi = useMemo(() => {
		return [...corsi].sort((a, b) => {
			if (a.categoria === b.categoria) {
				return a.nomeCorso.localeCompare(b.nomeCorso);
			}
			return a.categoria.localeCompare(b.categoria);
		});
	}, [corsi]);

	const corsoBase = useMemo(() => sortedCorsi.find(c => c.id === selectedCorsoBase), [selectedCorsoBase, sortedCorsi]);
	// Calcolo importoBase
	const importoBase = corsoBase ? corsoBase.prezzoBase : 0;
	const corsiAggiunti = useMemo(() => selectedCorsi.map(id => sortedCorsi.find(c => c.id === id)).filter(Boolean) as Corso[], [selectedCorsi, sortedCorsi]);

	// Helper per colore categoria
	const getCategoriaColor = (categoriaNome: string) => {
		const cat = categorie.find((c: any) => c.categoria === categoriaNome);
		return cat?.colore || '#e3f2fd';
	};

	// Subtotals
	const subtotalCorsi = useMemo(() => {
		let sum = 0;
		sum += corsiAggiunti.reduce((acc, c) => acc + c.prezzoAggiuntivo, 0);
		return sum;
	}, [corsiAggiunti]);

	// Totale corsi aggiuntivi scontato (per riga, in base alla % inserita)
	const subtotalCorsiScontato = useMemo(() => {
		return corsiAggiunti.reduce((acc, c) => {
			const raw = scontiCorsi[c.id];
			const parsed = raw === undefined || raw === '' ? 0 : Number(raw);
			const percent = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
			return acc + c.prezzoAggiuntivo * (1 - percent / 100);
		}, 0);
	}, [corsiAggiunti, scontiCorsi]);

	// Subtotale corsi = corso base + corsi aggiuntivi (si aggiorna al cambio selezioni)
	const subtotalCorsiTotale = useMemo(() => {
		return importoBase + subtotalCorsiScontato;
	}, [importoBase, subtotalCorsiScontato, subtotalCorsi]);

	// Prezzi scontati (come da formule Excel degli item in lista "ImportiPreventivo")
	const prezziScontatiExtra = useMemo(() => {
		return extraImporti.map((imp, idx) => {
			const percent = parseFloat((imp.valore || '').replace('%', '')) / 100;
			if (!Number.isFinite(percent)) return subtotalCorsiTotale;
			if (idx === 0) {
				return subtotalCorsiTotale * (1 - percent);
			}
			if (idx === 1) {
				return importoBase + subtotalCorsiScontato * (1 - percent);
			}
			if (idx === 2) {
				return importoBase + subtotalCorsiScontato * (1 - percent);
			}
			if (idx === 3) {
				return subtotalCorsiTotale * (1 - percent);
			}
			return subtotalCorsiTotale;
		});
	}, [extraImporti, importoBase, subtotalCorsi, subtotalCorsiTotale, subtotalCorsiScontato]);
	// Arrotondamento a multiplo di 5 euro
	const arrotonda5 = (val: number) => Math.round(val / 5) * 5;

	// Importo finale corsi (Excel: =PIÙ.SE(D29;E29;D32;E32;D27;E27;D30;E30;D31;E31))
	// Qui implementiamo la stessa logica: scegli il primo valore valido in base alle checkbox (senza sommare gli sconti).
	const importoFinaleCorsi = useMemo(() => {
		// Default: E27 = Subtotale Corsi
		let valore = subtotalCorsiTotale;

		// Priorità come in Excel: 1° item, 4° item, poi (default) subtotale, poi 2° e 3°
		if (checkedExtras[0]) {
			valore = prezziScontatiExtra[0] ?? subtotalCorsiTotale;
		} else if (checkedExtras[3]) {
			valore = prezziScontatiExtra[3] ?? subtotalCorsiTotale;
		} else if (checkedExtras[1]) {
			valore = prezziScontatiExtra[1] ?? subtotalCorsiTotale;
		} else if (checkedExtras[2]) {
			valore = prezziScontatiExtra[2] ?? subtotalCorsiTotale;
		}

		return arrotonda5(valore);
	}, [arrotonda5, checkedExtras, prezziScontatiExtra, subtotalCorsiTotale, subtotalCorsiScontato, subtotalCorsi]);

	// Selezione socio -> popola tipo iscrizione, corso base e corsi aggiuntivi
	const handleSelectSocio = (id: string) => {
		setSelectedSocioId(id);
		setScontiCorsi({});
		setCheckedExtras([false, false, false, false]);
		setCheckedQuotaSaggio(false);
		const socio = soci.find(s => s.id === id);
		if (!socio) {
			setSelectedTipo('');
			setSelectedCorsoBase('');
			setSelectedCorsi([]);
			return;
		}

		// Tipo iscrizione: abbina per valore in euro
		const socioQuota = parseFloat(String(socio.quotaIscrizione || '0'));
		const tipoMatch = tipiIscrizione.find(t => parseFloat(String(t.value || '0')) === socioQuota);
		setSelectedTipo(tipoMatch ? tipoMatch.id : '');

		// Corso base: mappa dal nome corso al suo id
		const baseCourse = socio.base ? sortedCorsi.find(c => c.nomeCorso === socio.base) : undefined;
		setSelectedCorsoBase(baseCourse ? baseCourse.id : '');

		// Corsi aggiuntivi: stringa separata da ; -> mappa nomi a ids
		const courseNames = (socio.corsi || '')
			.split(';')
			.map(s => s.trim())
			.filter(Boolean);
		const ids = courseNames
			.map(name => {
				const course = sortedCorsi.find(c => c.nomeCorso === name);
				return course ? course.id : undefined;
			})
			.filter((v): v is string => !!v);
		// Evita duplicati col corso base
		const filteredIds = baseCourse ? ids.filter(cid => cid !== baseCourse.id) : ids;
		setSelectedCorsi(filteredIds);

		// Quota saggio: abilita se presente (>0)
		const socioQuotaSaggio = parseFloat(String(socio.quotaSaggio || '0'));
		setCheckedQuotaSaggio(!!(socioQuotaSaggio > 0));
	};
	
	// Calcolo totali richiesti
	const quotaSaggio = checkedQuotaSaggio && importiPreventivo[4] ? parseFloat(importiPreventivo[4].valore) : 0;
	const iscrizioneTotale = arrotonda5(parseFloat(tipoValue) || 0);
	const quotaMensile = arrotonda5(importoFinaleCorsi + quotaSaggio);
	const percentualeScontoTrimestre = importiPreventivo[5] && importiPreventivo[5].valore
		? 1 - (parseFloat(importiPreventivo[5].valore.replace('%', '')) / 100)
		: 1;
	const quotaTrimestraleScontata = arrotonda5(((quotaMensile - quotaSaggio) * 3 * percentualeScontoTrimestre) + (quotaSaggio * 3));
	const percentualeScontoAnnuale = importiPreventivo[6] && importiPreventivo[6].valore
		? 1 - (parseFloat(importiPreventivo[6].valore.replace('%', '')) / 100)
		: 1;
	const quotaAnnualeScontata = arrotonda5(((quotaMensile - quotaSaggio) * 9 * percentualeScontoAnnuale) + (quotaSaggio * 9));

	// Actions
	const handleAddCorso = () => {
		if (selectedCorsoAggiuntivo && !selectedCorsi.includes(selectedCorsoAggiuntivo) && selectedCorsoAggiuntivo !== selectedCorsoBase) {
			setSelectedCorsi([...selectedCorsi, selectedCorsoAggiuntivo]);
			setSelectedCorsoAggiuntivo('');
		}
	};

	const getScontoPercent = (corsoId: string) => {
		const raw = scontiCorsi[corsoId];
		if (raw === undefined || raw === '') return 0;
		const n = Number(raw);
		if (!Number.isFinite(n)) return 0;
		return Math.min(100, Math.max(0, n));
	};

	const handleChangeSconto = (corsoId: string, value: string) => {
		if (value === '') {
			setScontiCorsi(prev => ({ ...prev, [corsoId]: '' }));
			return;
		}
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return;
		const clamped = Math.min(100, Math.max(0, parsed));
		setScontiCorsi(prev => ({ ...prev, [corsoId]: String(clamped) }));
	};

	const handleRemoveCorso = (id: string) => {
		setSelectedCorsi(selectedCorsi.filter(cId => cId !== id));
		setScontiCorsi(prev => {
			if (!(id in prev)) return prev;
			const next = { ...prev };
			delete next[id];
			return next;
		});
	};

	// Pulisci tutti i valori selezionati
	const handlePulisci = () => {
		setSelectedTipo('');
		setSelectedCorsoBase('');
		setSelectedCorsoAggiuntivo('');
		setSelectedCorsi([]);
		setScontiCorsi({});
		setCheckedExtras([false, false, false, false]);
		setCheckedQuotaSaggio(false);
	};

	// Apri dialog aggiungi socio con valori precompilati
	const handleAggiungiSocio = () => {
		const corsiNomi = selectedCorsi.map(id => {
			const corso = sortedCorsi.find(c => c.id === id);
			return corso ? corso.nomeCorso : id;
		});
		const baseNome = sortedCorsi.find(c => c.id === selectedCorsoBase)?.nomeCorso || selectedCorsoBase;
		setFormSocio({
			iscrizione: true,
			dataIscrizione: new Date().toISOString().slice(0, 10),
			quotaIscrizione: tipoValue,
			quotaMensile: quotaMensile.toFixed(2),
			base: baseNome,
			corsi: corsiNomi,
			quotaSaggio: checkedQuotaSaggio && importiPreventivo[4] ? importiPreventivo[4].valore : '',
			cognome: '',
			nome: '',
			codFiscale: '',
			dataNascita: '',
			luogoNascita: '',
			provinciaNascita: '',
			indirizzo: '',
			residenza: '',
			provinciaResidenza: '',
			telefono: '',
			email: '',
			scadenzaTessera: '',
			scadenzaCertificato: '',
			modulo: false,
			note: '',
			nomeGenitore: '',
			cognomeGenitore: '',
			codFiscaleGenitore: ''
		});
		setEditingSocio(null);
		setOpenSocioDialog(true);
	};

	// Apri dialog modifica socio selezionato: anagrafica/genitore/note dal socio, iscrizione dal preventivo
	const handleModificaSocio = () => {
		if (!selectedSocioId) return;
		const socio = soci.find(s => s.id === selectedSocioId);
		if (!socio) return;
		const corsiNomi = selectedCorsi.map(id => {
			const corso = sortedCorsi.find(c => c.id === id);
			return corso ? corso.nomeCorso : id;
		});
		const baseNome = sortedCorsi.find(c => c.id === selectedCorsoBase)?.nomeCorso || selectedCorsoBase;
		const initialForm = {
			// Iscrizione (from current preventivo)
			iscrizione: true,
			dataIscrizione: new Date().toISOString().slice(0, 10),
			quotaIscrizione: tipoValue,
			quotaMensile: quotaMensile.toFixed(2),
			base: baseNome,
			corsi: corsiNomi,
			quotaSaggio: checkedQuotaSaggio && importiPreventivo[4] ? importiPreventivo[4].valore : '',
			// Anagrafica (from socio)
			cognome: socio.cognome || '',
			nome: socio.nome || '',
			codFiscale: socio.codFiscale || '',
			dataNascita: socio.dataNascita || '',
			luogoNascita: socio.luogoNascita || '',
			provinciaNascita: socio.provinciaNascita || '',
			indirizzo: socio.indirizzo || '',
			residenza: socio.residenza || '',
			provinciaResidenza: socio.provinciaResidenza || '',
			telefono: socio.telefono || '',
			email: socio.email || '',
			scadenzaTessera: socio.scadenzaTessera || '',
			scadenzaCertificato: socio.scadenzaCertificato || '',
			// Genitore
			nomeGenitore: socio.nomeGenitore || '',
			cognomeGenitore: socio.cognomeGenitore || '',
			codFiscaleGenitore: socio.codFiscaleGenitore || '',
			// Note
			note: socio.note || '',
			// Flags
			modulo: socio.modulo || false,
			agonistico: socio.agonistico || false,
			sospeso: socio.sospeso || false,
		};
		setFormSocio(initialForm);
		setEditingSocio(socio);
		setOpenSocioDialog(true);
	};

	return (
		<Box width="50%" mx="auto" mt={4}>
			<Card elevation={6} sx={{ borderRadius: 4, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', boxShadow: 6 }}>
				<CardContent>
					<Box display="flex" alignItems="center" justifyContent="center" mb={2}>
						<Avatar sx={{ bgcolor: '#1976d2', mr: 2, width: 60, height: 60 }}>
							<CalculateIcon sx={{ fontSize: 60 }} />
						</Avatar>
						<Typography variant="h4" fontWeight={600} color="#1976d2">Calcolo Preventivo</Typography>
					</Box>

					<Divider sx={{ mb: 3 }} />
					<Stack spacing={3}>
						<Box display="flex" alignItems="center" gap={2}>
							<Typography sx={{ minWidth: 140, fontWeight: 500 }}>Seleziona Socio</Typography>
							<TextField
								select
								value={selectedSocioId}
								onChange={e => handleSelectSocio(e.target.value)}
								size="small"
								sx={{width: 430, bgcolor: 'white', borderRadius: 2 }}
							>
								<MenuItem value="">Nessuno</MenuItem>
								{soci
									.slice()
									.sort((a, b) => {
										const ccomp = (a.cognome || '').localeCompare(b.cognome || '');
										if (ccomp !== 0) return ccomp;
										return (a.nome || '').localeCompare(b.nome || '');
									})
									.map(s => (
										<MenuItem key={s.id} value={s.id}>{`${s.cognome} ${s.nome}`}</MenuItem>
									))}
							</TextField>
						</Box>
						<Box display="flex" alignItems="center" gap={2}>
							<Typography sx={{ minWidth: 140, fontWeight: 500 }}>Tipo Iscrizione</Typography>
							<TextField
								select
								value={selectedTipo}
								onChange={e => setSelectedTipo(e.target.value)}
								size="small"
								sx={{ width: 430, bgcolor: 'white', borderRadius: 2 }}
							>
								{tipiIscrizione.map(tipo => (
									<MenuItem key={tipo.id} value={tipo.id}>{tipo.tipo}</MenuItem>
								))}
							</TextField>
							<Typography sx={{ width: 90, textAlign: 'right', fontWeight: 500, color: '#1976d2' }}>
								{selectedTipo ? `${tipoValue} €` : ''}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" gap={2}>
							<Typography sx={{ minWidth: 140, fontWeight: 500 }}>Corso base</Typography>
							<TextField
								select
								value={selectedCorsoBase}
								onChange={e => setSelectedCorsoBase(e.target.value)}
								size="small"
								sx={{ width: 430, bgcolor: 'white', borderRadius: 2 }}
							>
								{sortedCorsi.map(corso => {
									const cat = categorie.find((c: any) => c.categoria === corso.categoria);
									return (
										<MenuItem key={corso.id} value={corso.id}>
											<Box display="flex" alignItems="center" gap={1}>
												<Box
													component="span"
													sx={{
														display: 'inline-block',
														width: 18,
														height: 18,
														borderRadius: '4px',
														backgroundColor: cat?.colore || '#e3f2fd',
														border: '1px solid #ccc',
														mr: 1,
														verticalAlign: 'middle'
													}}
												/>
												<span style={{ fontWeight: 350 }}>{corso.nomeCorso}</span>
												<span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{corso.prezzoBase}€</span>
											</Box>
										</MenuItem>
									);
								})}
							</TextField>
							<Typography sx={{ width: 90, textAlign: 'right', fontWeight: 500, color: '#1976d2' }}>
								{corsoBase ? <span style={{ display: 'inline-block', minWidth: 60}}>{corsoBase.prezzoBase} €</span> : ''}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" gap={2}>
							<Typography sx={{ minWidth: 140, fontWeight: 500 }}>Aggiungi corso</Typography>
							<TextField
								select
								value={selectedCorsoAggiuntivo}
								onChange={e => setSelectedCorsoAggiuntivo(e.target.value)}
								size="small"
								sx={{ width: 430, bgcolor: 'white', borderRadius: 2 }}
							>
								{sortedCorsi
									.filter(corso => corso.id !== selectedCorsoBase && !selectedCorsi.includes(corso.id))
									.map(corso => {
										const cat = categorie.find((c: any) => c.categoria === corso.categoria);
										return (
											<MenuItem key={corso.id} value={corso.id}>
												<Box display="flex" alignItems="center" gap={1}>
													<Box
														component="span"
														sx={{
															display: 'inline-block',
															width: 18,
															height: 18,
															borderRadius: '4px',
															backgroundColor: cat?.colore || '#e3f2fd',
															border: '1px solid #ccc',
															mr: 1,
															verticalAlign: 'middle'
														}}
													/>
													<span style={{ fontWeight: 500 }}>{corso.nomeCorso}</span>
													<span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{corso.prezzoAggiuntivo}€</span>
												</Box>
											</MenuItem>
										);
									})}
							</TextField>
							<IconButton
								color="primary"
								onClick={handleAddCorso}
								disabled={!selectedCorsoAggiuntivo}
								sx={{ minWidth: 48 }}
							>
								<AddCircleOutlineIcon fontSize="large" />
							</IconButton>
						</Box>
						{corsiAggiunti.length > 0 && (
							<Box>
								<Typography variant="subtitle1" gutterBottom fontWeight={600} color="#1976d2">Corsi aggiuntivi:</Typography>
								<Stack spacing={1}>
									{corsiAggiunti.map(corso => (
										<Card key={corso.id} elevation={2} sx={{ bgcolor: "#e3f2fd", borderRadius: 2 }}>
											<CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
												<Box
													sx={{
														width: 18,
														height: 18,
														borderRadius: '6px',
														backgroundColor: getCategoriaColor(corso.categoria),
														border: '1px solid #ccc',
														mr: 1,
														display: 'inline-block',
													}}
												/>
												<Box sx={{ flex: 1, display: 'flex'}}>
													<Typography sx={{ fontWeight: 500, textAlign: 'center' }}>{corso.nomeCorso}</Typography>
												</Box>
														<Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
															<TextField
																type="number"
																size="small"
																value={scontiCorsi[corso.id] ?? ''}
																onChange={e => handleChangeSconto(corso.id, e.target.value)}
																sx={{ width: 90, bgcolor: 'white', borderRadius: 2 }}
																inputProps={{ min: 0, max: 100, step: 1 }}
																InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
															/>

															<Box sx={{ minWidth: 90, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
																<Typography sx={{ fontWeight: 500, textAlign: 'right', color: '#888', textDecoration: 'line-through' }}>
																	<span style={{ display: 'inline-block', textAlign: 'right' }}>{corso.prezzoAggiuntivo.toFixed(2)} €</span>
																</Typography>
																<Typography sx={{ fontWeight: 700, textAlign: 'right', color: '#1976d2' }}>
																	<span style={{ display: 'inline-block', textAlign: 'right' }}>{(corso.prezzoAggiuntivo * (1 - getScontoPercent(corso.id) / 100)).toFixed(2)} €</span>
																</Typography>
															</Box>
														</Box>
												<IconButton size="small" onClick={() => handleRemoveCorso(corso.id)}>
													<DeleteIcon fontSize="small" />
												</IconButton>
											</CardContent>
										</Card>
									))}
									   </Stack>
							</Box>
						)}
						<Divider sx={{ my: 2 }} />
						<Box display="flex" alignItems="center" gap={2}>
							<Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ minWidth: 180, fontWeight: 600, textAlign: 'right' }}>Importo Totale Corsi Aggiuntivi</Typography>
							</Box>
							<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ fontWeight: 600, textAlign: 'right', color: '#1976d2' }}><span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{arrotonda5(subtotalCorsiScontato).toFixed(2)} €</span></Typography>
							</Box>
						</Box>
						<Box display="flex" alignItems="center" gap={2}>
							<Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ minWidth: 180, fontWeight: 600, textAlign: 'right' }}>Subtotale Corsi</Typography>
							</Box>
							<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ fontWeight: 600, textAlign: 'right', color: '#1976d2' }}><span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{arrotonda5(subtotalCorsiTotale)} €</span></Typography>
							</Box>
						</Box>
						{extraImporti.length > 0 && (
							<>
								<Divider sx={{ my: 2 }} />
								{extraImporti.map((imp, idx) => {
									const percent = parseFloat((imp.valore || '').replace('%', '')) / 100;
									let valoreCalcolato = imp.valore;
									if (idx === 0) {
										valoreCalcolato = (arrotonda5(subtotalCorsiTotale * (1 - percent))).toFixed(2) + ' €';
									} else if (idx === 1) {
										valoreCalcolato = (arrotonda5(importoBase + subtotalCorsiScontato * (1 - percent))).toFixed(2) + ' €';
									}
									else if (idx === 2) {
										valoreCalcolato = (arrotonda5(importoBase + (subtotalCorsiScontato * (1 - percent)))).toFixed(2) + ' €';
									} else if (idx === 3) {
										valoreCalcolato = (arrotonda5(subtotalCorsiTotale * (1 - percent))).toFixed(2) + ' €';
									}
									return (
										<Box key={imp.id} display="flex" alignItems="center" gap={2}>
											<Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
												<Typography sx={{ minWidth: 180, fontWeight: 500, textAlign: 'left' }}>{imp.descrizione}</Typography>
											</Box>
											<Box sx={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
												<FormControlLabel
													control={
														<Checkbox
															checked={checkedExtras[idx]}
															onChange={() => handleCheckExtra(idx)}
															color="primary"
														/>
													}
													label=""
													sx={{ marginRight: 0 }}
												/>
											</Box>
											<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
												<Typography sx={{ fontWeight: 500, textAlign: 'right', color: checkedExtras[idx] ? '#1976d2' : '#888' }}><span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{valoreCalcolato}</span></Typography>
											</Box>
										</Box>
									);
								})}
								<Divider sx={{ my: 2 }} />
								<Box display="flex" alignItems="center" gap={2}>
									<Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
										<Typography sx={{ minWidth: 180, fontWeight: 700, textAlign: 'right', }}>Importo finale corsi</Typography>
									</Box>
									<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
										<Typography sx={{ fontWeight: 700, textAlign: 'right', color: '#1976d2' }}>
											<span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{importoFinaleCorsi.toFixed(2)} €</span>
										</Typography>
									</Box>
								</Box>
								   <Box display="flex" alignItems="center" gap={2} mt={2}>
									   <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
										   <Typography sx={{ minWidth: 180, fontWeight: 500, textAlign: 'left' }}>Quota saggio</Typography>
									   </Box>
									   <Box sx={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
										   <Checkbox
											   checked={checkedQuotaSaggio}
											   onChange={() => setCheckedQuotaSaggio(v => !v)}
											   color="primary"
										   />
									   </Box>
									   <Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
										   {checkedQuotaSaggio && importiPreventivo[4] && (
											   <Typography sx={{ fontWeight: 500, textAlign: 'right', color: '#1976d2' }}>
												   <span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{importiPreventivo[4].valore} €</span>
											   </Typography>
										   )}
									   </Box>
								   </Box>
								   <Divider sx={{ my: 2 }} />
								   <Box mt={2}>
									   <Typography variant="h6" fontWeight={700} color="#1976d2" gutterBottom>Totali</Typography>
									   <Stack spacing={2}>
										   <Box display="flex" alignItems="center" gap={2}>
											   <Typography sx={{ minWidth: 180, fontWeight: 500, textAlign: 'left' }}>Iscrizione</Typography>
											   <Box sx={{ flex: 1 }} />
											   <Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
												   <Typography sx={{ fontWeight: 900, textAlign: 'right', color: '#1976d2' }}>
													   <span style={{ display: 'inline-block', minWidth: 80, textAlign: 'right', fontWeight: 'bold' }}><strong>{iscrizioneTotale.toFixed(2)} €</strong></span>
												   </Typography>
											   </Box>
										   </Box>
										   <Box display="flex" alignItems="center" gap={2}>
											   <Typography sx={{ minWidth: 180, fontWeight: 500, textAlign: 'left' }}>Quota mensile</Typography>
											   <Box sx={{ flex: 1 }} />
											   <Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
												   <Typography sx={{ fontWeight: 900, textAlign: 'right', color: '#1976d2' }}>
													   <span style={{ display: 'inline-block', minWidth: 80, textAlign: 'right', fontWeight: 'bold' }}><strong>{quotaMensile.toFixed(2)} €</strong></span>
												   </Typography>
											   </Box>
										   </Box>
										   <Box display="flex" alignItems="center" gap={2}>
											   <Typography sx={{ minWidth: 180, fontWeight: 500, textAlign: 'left' }}>Quota trimestrale scontata {importiPreventivo[5]?.valore || ''}</Typography>
											   <Box sx={{ flex: 1 }} />
											   <Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
												   <Typography sx={{ fontWeight: 900, textAlign: 'right', color: '#1976d2' }}>
													   <span style={{ display: 'inline-block', minWidth: 80, textAlign: 'right', fontWeight: 'bold' }}><strong>{quotaTrimestraleScontata.toFixed(2)} €</strong></span>
												   </Typography>
											   </Box>
										   </Box>
										   <Box display="flex" alignItems="center" gap={2}>
											   <Typography sx={{ minWidth: 180, fontWeight: 500, textAlign: 'left' }}>Quota annuale scontata {importiPreventivo[6]?.valore || ''}</Typography>
											   <Box sx={{ flex: 1 }} />
											   <Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
												   <Typography sx={{ fontWeight: 900, textAlign: 'right', color: '#1976d2' }}>
													   <span style={{ display: 'inline-block', minWidth: 80, textAlign: 'right', fontWeight: 'bold' }}><strong>{quotaAnnualeScontata.toFixed(2)} €</strong></span>
												   </Typography>
											   </Box>
										   </Box>
									   </Stack>
								   </Box>
								   
									   {/* IBAN e Intestato a */}
									   <Box mt={2} display="flex" justifyContent="flex-start" alignItems="center" gap={2}>
										   <Box sx={{ flex: 1 }}>
											   {importiPreventivo[7]?.valore && (
												   <Typography variant="body2" sx={{ color: '#888', fontSize: 13 }}>
													   IBAN: {importiPreventivo[7].valore}
												   </Typography>
											   )}
											   {importiPreventivo[8]?.valore && (
												   <Typography variant="body2" sx={{ color: '#888', fontSize: 13 }}>
													   Intestato a: {importiPreventivo[8].valore}
												   </Typography>
											   )}
										   </Box>
										   {/* Bottoni aggiungi/pulisci */}
										   <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop:'12px' }}>
											   <Button 
												   variant="contained" 
												   size="small" 
												   onClick={handlePulisci} 
												   sx={{ mr: 1, bgcolor: 'red', color: 'white', '&:hover': { bgcolor: '#b71c1c' } }}
											   >
												   Pulisci
											   </Button>
											   {profile?.role !== 'reader' && (
												   <>
													   <Button variant="contained" color="primary" size="small" onClick={handleAggiungiSocio} sx={{ mr: 1 }}>Aggiungi socio</Button>
													   <Button variant="contained" color="primary" size="small" onClick={handleModificaSocio} disabled={!selectedSocioId}>Modifica socio</Button>
												   </>
											   )}
										   </Box>
									   </Box>

									   {/* Modale di conferma aggiunta socio */}
									   {/* Dialog aggiungi socio */}
									   {openSocioDialog && (
										   <GestioneSociDialog
											   open={openSocioDialog}
											   onClose={() => setOpenSocioDialog(false)}
											   initialForm={formSocio}
											   editingSocio={editingSocio}
											   createSocio={createSocio}
											   updateSocio={updateSocio}
										   />
									   )}
							</>
						)}
					</Stack>
				</CardContent>
			</Card>
		</Box>
	);
};

export default CalcoloPreventivo;
