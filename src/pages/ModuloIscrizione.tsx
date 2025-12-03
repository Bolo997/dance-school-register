import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { useAuth } from '../contexts/AuthContext';
import { Socio, InfoSito } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';

const ModuloIscrizione: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { data: soci, loading } = useSupabaseData<Socio>('Soci', { userName: profile?.userName || 'Unknown' });
  const { data: infoSito } = useSupabaseData<InfoSito>('InfoSito');
  
  const [socio, setSocio] = useState<Socio | null>(null);
  const anno = infoSito.find(info => info.campo === 'anno')?.valore || '';
  const iscrizioneDichiaro = infoSito.find(info => info.campo === 'IscrizioneDichiaro')?.valore || '';
  const iscrizioneAccetta = infoSito.find(info => info.campo === 'IscrizioneAccetta')?.valore || '';
  const iscrizionePassiAddio = infoSito.find(info => info.campo === 'IscrizionePassiAddio')?.valore || '';

  useEffect(() => {
    if (!loading && id) {
      const foundSocio = soci.find(s => String(s.id) === String(id));
      if (foundSocio) {
        setSocio(foundSocio);
      }
    }
  }, [id, soci, loading]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography>Caricamento...</Typography>
      </Container>
    );
  }

  if (!socio) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/gestione-soci')}
            sx={{ color: 'primary.main' }}
            title="Torna a Gestione Soci"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">Socio non trovato</Typography>
        </Box>
      </Container>
    );
  }

  const corsiArray = socio.corsi ? socio.corsi.split(';').filter(c => c.trim()) : [];

  return (
    <Container maxWidth="lg">
      <Box className="no-print" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/gestione-soci')}
          sx={{ color: 'primary.main' }}
          title="Torna a Gestione Soci"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Modulo di Tesseramento
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Stampa
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4, '@media print': { boxShadow: 'none', p: 2 } }}>
        {/* PAGINA 1 */}
        <Box sx={{ mb: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3, border: '2px solid black', p: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14px' }}>
              A.I.C.S. CENTRO STUDI DANZA CLASSICA
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '12px' }}>
              MODULO DI TESSERAMENTO {anno}
            </Typography>
          </Box>

          {/* DATI DELL'ISCRITTO */}
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px' }}>
              DATI DELL'ISCRITTO
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>COGNOME</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.cognome}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>NOME</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.nome}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>C.F.</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.codFiscale}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 1, mb: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>NATO IL</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.dataNascita}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>LUOGO DI NASCITA</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.luogoNascita}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>PROV.</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.provinciaNascita}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>INDIRIZZO</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.indirizzo}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>COMUNE</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.residenza}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>PROV.</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.provinciaResidenza}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, mt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>TELEFONO</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.telefono}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>EMAIL</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.email}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
            </Box>
          </Box>

          {/* DATI DEL GENITORE / TUTORE */}
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px' }}>
              DATI DEL GENITORE / TUTORE (COMPILARE SOLO SE L'ISCRIZIONE RIGUARDA UN MINORE)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>COGNOME</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.cognomeGenitore || ''}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>NOME</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={socio.nomeGenitore || ''}
                  InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                  sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
                />
              </Box>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>C.F.</Typography>
              <TextField
                fullWidth
                size="small"
                value={socio.codFiscaleGenitore || ''}
                InputProps={{ readOnly: true, sx: { fontSize: '10px', height: '24px' } }}
                sx={{ '& .MuiInputBase-input': { padding: '2px 4px' } }}
              />
            </Box>
            <Typography variant="caption" sx={{ fontSize: '8px', mt: 1, display: 'block', fontStyle: 'italic' }}>
              DICHIARO DI ESERCITARE LA RESPONSABILITÀ DA CUI SOPRA OBBLIGATO DA CORRESPONSABILITÀ DEL MINORE, AL FINE DI FAR PARTECIPARE QUEST'ULTIMO ALL'ISCRIZIONE E AI DOCUMENTI DI SVOLGIMENTO E AGLI ONERI ECONOMICI E ORGANIZZATIVI PREVISTI.
            </Typography>
          </Box>

          {/* RICHIEDE L'ISCRIZIONE PER */}
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px' }}>
              RICHIEDE L'ISCRIZIONE PER
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {socio.base && (
                <li>
                  <Typography variant="body2" sx={{ fontSize: '10px' }}>
                    {socio.base}
                  </Typography>
                </li>
              )}
              {corsiArray.map((corso, idx) => (
                <li key={idx}>
                  <Typography variant="body2" sx={{ fontSize: '10px' }}>
                    {corso}
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>

          {/* DICHIARA */}
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px' }}>
              DICHIARA
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mb: 1, lineHeight: 1.3 }}>
              {iscrizioneDichiaro}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                ROMA, LI _______________
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>
          </Box>

          {/* ACCETTA */}
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px' }}>
              ACCETTA
            </Typography>
            <Typography 
              component="div" 
              variant="caption" 
              sx={{ 
                fontSize: '8px', 
                lineHeight: 1.4,
                '& ul': {
                  margin: 0,
                  paddingLeft: '16px'
                }
              }}
              dangerouslySetInnerHTML={{ __html: iscrizioneAccetta }}
            />
          </Box>

          {/* PASSI DI ADDIO CON PARTNER */}
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '11px' }}>
              PASSI DI ADDIO CON PARTNER
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mb: 1, lineHeight: 1.3 }}>
              {iscrizionePassiAddio}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* PAGINA 2 - PRIVACY */}
        <Box sx={{ pageBreakBefore: 'always', '@media print': { pageBreakBefore: 'always' } }}>
          <Box sx={{ border: '2px solid black', p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, fontSize: '11px', textAlign: 'center' }}>
              PRESA VISIONE DELL'INFORMATIVA RESA AI SENSI DELL'ART.13 DEL REG. 2016/679
              CONSENSO AL TRATTAMENTO DEI DATI PERSONALI CONFERIMENTO DETERMINATE FINALITÀ
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    IN PROPRIO
                  </Typography>
                }
              />
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    QUALE GENITORE ESERCENTE LA POTESTÀ GENITORIALE SU MIOÁ FIGLIA
                  </Typography>
                }
              />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '10px' }}>
              DICHIARO
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mb: 2, lineHeight: 1.3 }}>
              DI AVER RICEVUTO L'INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI DI CUI ALL'ART. 13 DEL REG. UE 679/2016 ED IN RELAZIONE AL CONSENSO A DISPOSIZIONE DEL TITOLARE DEL TRATTAMENTO
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA,
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>

            {/* Sezione 1 */}
            <Box sx={{ mb: 3, border: '1px solid #ccc', p: 1 }}>
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    DO IL MIO CONSENSO
                  </Typography>
                }
              />
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    NEGO IL MIO CONSENSO
                  </Typography>
                }
              />
              <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mt: 1, lineHeight: 1.3 }}>
                AL TRATTAMENTO DEI DATI PERSONALI PER LE FINALITÀ INDICATE AL PUNTO 2.2. LETT.A DELL'INFORMATIVA DI CUI AL SEGUITO (ATTIVITÀ ISTITUZIONALI E FINALITÀ STATUTARIE, PERS.TEMP, ADEMPIMENTI DI OBBLIGHI PREVISTI DA LEGGE, DA REGOLAMENTO O DALLA NORMATIVA COMUNITARIA), LE QUALI, LADDOVE ATTINENTI ALLA SALUTE, SONO DA QUALIFICARSI COME DATI PARTICOLARE DI CUI ALL'ART 9 DEL REGOLAMENTO DA PARTE DELL'ASSOCIAZIONE.
              </Typography>
            </Box>

            {/* IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA, */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA,
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>

            {/* Sezione 2 */}
            <Box sx={{ mb: 3, border: '1px solid #ccc', p: 1 }}>
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    DO IL MIO CONSENSO
                  </Typography>
                }
              />
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    NEGO IL MIO CONSENSO
                  </Typography>
                }
              />
              <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mt: 1, lineHeight: 1.3 }}>
                AL TRATTAMENTO DEI DATI PERSONALI PER LE FINALITÀ DI MARKETING INDICATE AL PUNTO 2.2 LETT. B DELL'INFORMATIVA DI CUI AL SEGUITO (ATTIVITÀ DI MARKETING TRAMITE E-MAIL, INVIO DI MATERIALE PER ISCRIZIONE AL DOMICILIO, TELEFONATE, EMAIL, FAX, ED INVIO DI MATERIALE INFORMATIVO E REGOLAMENTARE DA PARTE DELL'ASSOCIAZIONE
              </Typography>
            </Box>

            {/* IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA, */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA,
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>

            {/* Sezione 3 */}
            <Box sx={{ mb: 3, border: '1px solid #ccc', p: 1 }}>
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    DELL'ASSOCIAZIONE
                  </Typography>
                }
              />
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    ANCHE ENTI E/O ASSOCIAZIONE AFFILIATI
                  </Typography>
                }
              />
              <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mt: 1, lineHeight: 1.3 }}>
                FIRMA _______________________
              </Typography>
            </Box>

            {/* IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA, */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                IO SOTTOSCRITTO, NELLA DICHIARATA QUALITÀ DI CUI SOPRA,
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>

            {/* Sezione 4 */}
            <Box sx={{ mb: 3, border: '1px solid #ccc', p: 1 }}>
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    AUTORIZZO
                  </Typography>
                }
              />
              <FormControlLabel
                control={<Checkbox size="small" disabled />}
                label={
                  <Typography variant="caption" sx={{ fontSize: '9px' }}>
                    NON AUTORIZZO
                  </Typography>
                }
              />
              <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mt: 1, lineHeight: 1.3 }}>
                RIPRESE FOTOGRAFICHE E VIDEO DEL SOTTOSCRITTO E/DEL PROPRIO FIGLIO IN CASO DI MINORI, NONCHÉ L'UTILIZZAZIONE DELLA RELATIVA IMMAGINE, EFFETTUATE PER LA PRODUZIONE DI FINI ISTITUZIONALI DURANTE LO SVOLGIMENTO DELLE ATTIVITÀ, CHE TRAMITE ESIBIZIONI E MANIFESTAZIONI
              </Typography>
            </Box>

            {/* Firma finale */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                ROMA, LI _______________
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '9px' }}>
                FIRMA _______________________
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            @page {
              margin: 0.5cm;
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

export default ModuloIscrizione;
