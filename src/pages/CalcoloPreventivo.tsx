import React, { useState, useMemo } from 'react';
import { Button } from '@mui/material';
import { TextField, MenuItem, Box, Typography, IconButton, Stack, Card, CardContent, Divider, Avatar, Checkbox, FormControlLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { TipoIscrizione, Corso, ImportoPreventivo } from '../types';
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
	const [selectedTipo, setSelectedTipo] = useState<string>('');
	const [selectedCorsoBase, setSelectedCorsoBase] = useState<string>('');
	const [selectedCorsoAggiuntivo, setSelectedCorsoAggiuntivo] = useState<string>('');
	const [selectedCorsi, setSelectedCorsi] = useState<string[]>([]);
	const [openSocioDialog, setOpenSocioDialog] = useState(false);
	const [formSocio, setFormSocio] = useState<any>({});

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
	const importoBase = corsoBase ? corsoBase.prezzo : 0;
	const corsiAggiunti = useMemo(() => selectedCorsi.map(id => sortedCorsi.find(c => c.id === id)).filter(Boolean) as Corso[], [selectedCorsi, sortedCorsi]);

	// Helper per colore categoria
	const getCategoriaColor = (categoriaNome: string) => {
		const cat = categorie.find((c: any) => c.categoria === categoriaNome);
		return cat?.colore || '#e3f2fd';
	};

	// Subtotals
	const subtotalCorsi = useMemo(() => {
		let sum = 0;
		sum += corsiAggiunti.reduce((acc, c) => acc + c.prezzo, 0);
		return sum;
	}, [corsiAggiunti]);

	const subtotalIscrizione = useMemo(() => {
		const tipoNum = parseFloat(tipoValue) || 0;
		return subtotalCorsi + tipoNum + importoBase;
	}, [subtotalCorsi, tipoValue]);

	// Calcolo valori extra selezionati
	const valoriExtraSelezionati = extraImporti.map((imp, idx) => {
		if (!checkedExtras[idx]) return 0;
		const percent = parseFloat((imp.valore || '').replace('%', '')) / 100;
		// Stessa logica di visualizzazione
		if (idx === 0) {
			return subtotalIscrizione * (1 - percent);
		} else if (idx === 1) {
			return importoBase + subtotalCorsi * (1 - percent);
		} else if (idx === 2) {
			return importoBase + (subtotalCorsi * (1 - percent));
		} else if (idx === 3) {
			return subtotalIscrizione * (1 - percent);
		}
		return 0;
	});
	const sommaValoriExtra = valoriExtraSelezionati.reduce((acc, v) => acc + v, 0);
	const importoFinaleCorsi = subtotalIscrizione - sommaValoriExtra;

	// Calcolo totali richiesti
	const quotaSaggio = checkedQuotaSaggio && importiPreventivo[4] ? parseFloat(importiPreventivo[4].valore) : 0;
	const iscrizioneTotale = parseFloat(tipoValue) || 0;
	const quotaMensile = importoFinaleCorsi + quotaSaggio;
	const percentualeScontoTrimestre = importiPreventivo[5] && importiPreventivo[5].valore
		? 1 - (parseFloat(importiPreventivo[5].valore.replace('%', '')) / 100)
		: 1;
	const quotaTrimestraleScontata = ((quotaMensile - quotaSaggio) * 3 * percentualeScontoTrimestre) + (quotaSaggio * 3);
	const percentualeScontoAnnuale = importiPreventivo[6] && importiPreventivo[6].valore
		? 1 - (parseFloat(importiPreventivo[6].valore.replace('%', '')) / 100)
		: 1;
	const quotaAnnualeScontata = ((quotaMensile - quotaSaggio) * 9 * percentualeScontoAnnuale) + (quotaSaggio * 9);

	// Actions
	const handleAddCorso = () => {
		if (selectedCorsoAggiuntivo && !selectedCorsi.includes(selectedCorsoAggiuntivo) && selectedCorsoAggiuntivo !== selectedCorsoBase) {
			setSelectedCorsi([...selectedCorsi, selectedCorsoAggiuntivo]);
			setSelectedCorsoAggiuntivo('');
		}
	};

	const handleRemoveCorso = (id: string) => {
		setSelectedCorsi(selectedCorsi.filter(cId => cId !== id));
	};

	// Pulisci tutti i valori selezionati
	const handlePulisci = () => {
		setSelectedTipo('');
		setSelectedCorsoBase('');
		setSelectedCorsoAggiuntivo('');
		setSelectedCorsi([]);
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
							<Typography sx={{ minWidth: 140, fontWeight: 500 }}>Tipo Iscrizione</Typography>
							<TextField
								select
								value={selectedTipo}
								onChange={e => setSelectedTipo(e.target.value)}
								size="small"
								sx={{ minWidth: 360, bgcolor: 'white', borderRadius: 2 }}
							>
								{tipiIscrizione.map(tipo => (
									<MenuItem key={tipo.id} value={tipo.id}>{tipo.tipo}</MenuItem>
								))}
							</TextField>
							<Typography sx={{ minWidth: 120, textAlign: 'right', fontWeight: 500, color: '#1976d2' }}>
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
								sx={{ minWidth: 360, bgcolor: 'white', borderRadius: 2 }}
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
												<span style={{ fontWeight: 500 }}>{corso.nomeCorso}</span>
												<span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{corso.prezzo}€</span>
											</Box>
										</MenuItem>
									);
								})}
							</TextField>
							<Typography sx={{ minWidth: 120, textAlign: 'right', fontWeight: 500, color: '#1976d2' }}>
								{corsoBase ? <span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{corsoBase.prezzo} €</span> : ''}
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" gap={2}>
							<Typography sx={{ minWidth: 140, fontWeight: 500 }}>Aggiungi corso</Typography>
							<TextField
								select
								value={selectedCorsoAggiuntivo}
								onChange={e => setSelectedCorsoAggiuntivo(e.target.value)}
								size="small"
								sx={{ minWidth: 360, bgcolor: 'white', borderRadius: 2 }}
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
													<span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{corso.prezzo}€</span>
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
											<CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
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
												<Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
													<Typography sx={{ fontWeight: 500, textAlign: 'center' }}>{corso.nomeCorso}</Typography>
												</Box>
												<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
													<Typography sx={{ fontWeight: 500, textAlign: 'right' }}><span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{corso.prezzo} €</span></Typography>
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
								<Typography sx={{ minWidth: 180, fontWeight: 600, textAlign: 'right' }}>Subtotale corsi</Typography>
							</Box>
							<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ fontWeight: 600, textAlign: 'right', color: '#1976d2' }}><span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{subtotalCorsi} €</span></Typography>
							</Box>
						</Box>
						<Box display="flex" alignItems="center" gap={2}>
							<Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ minWidth: 180, fontWeight: 600, textAlign: 'right' }}>Subtotale iscrizione</Typography>
							</Box>
							<Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<Typography sx={{ fontWeight: 600, textAlign: 'right', color: '#1976d2' }}><span style={{ display: 'inline-block', minWidth: 60, textAlign: 'right' }}>{subtotalIscrizione} €</span></Typography>
							</Box>
						</Box>
						{extraImporti.length > 0 && (
							<>
								<Divider sx={{ my: 2 }} />
								{extraImporti.map((imp, idx) => {
									const percent = parseFloat((imp.valore || '').replace('%', '')) / 100;
									let valoreCalcolato = imp.valore;
									if (idx === 0) {
										valoreCalcolato = (subtotalIscrizione * (1 - percent)).toFixed(2) + ' €';
									} else if (idx === 1) {
										valoreCalcolato = (importoBase + subtotalCorsi * (1 - percent)).toFixed(2) + ' €';
									}
									else if (idx === 2) {
										valoreCalcolato = (importoBase + (subtotalCorsi * (1 - percent))).toFixed(2) + ' €';
									}else if (idx === 3) {
										valoreCalcolato = (subtotalIscrizione * (1 - percent)).toFixed(2) + ' €';
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
										   <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
											   <Button 
												   variant="contained" 
												   size="small" 
												   onClick={handlePulisci} 
												   sx={{ mr: 1, bgcolor: 'red', color: 'white', '&:hover': { bgcolor: '#b71c1c' } }}
											   >
												   Pulisci
											   </Button>
											   {profile?.role !== 'reader' && (
												   <Button variant="contained" color="primary" size="small" onClick={handleAggiungiSocio}>Aggiungi socio</Button>
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
