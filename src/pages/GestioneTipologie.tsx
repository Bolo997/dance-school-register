import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import WarningDialog from '../components/WarningDialog';
import { CategoriaCorso, Corso } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFormValidation } from '../hooks/useFormValidation';
import { ERROR_MESSAGES } from '../constants';

const GestioneTipologie: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { errors: categoriaErrors, validate: validateCategoria, clearAllErrors: clearCategoriaErrors } = useFormValidation();
  
  const { 
    data: categorie, 
    create: createCategoria, 
    update: updateCategoria, 
    remove: removeCategoria 
  } = useSupabaseData<CategoriaCorso>('CategorieCorsi', { userName: profile?.userName || 'Unknown' });
  
  const { data: corsi } = useSupabaseData<Corso>('Corsi', { userName: profile?.userName || 'Unknown' });
  
  const [openCategoriaDialog, setOpenCategoriaDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCorso | null>(null);
  const [categoria, setCategoria] = useState('');
  const [colore, setColore] = useState('#1976d2');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [affectedCorsi, setAffectedCorsi] = useState<Corso[]>([]);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenCategoriaDialog = useCallback((cat?: CategoriaCorso) => {
    if (cat) {
      setEditingCategoria(cat);
      setCategoria(cat.categoria);
      setColore(cat.colore);
    } else {
      setEditingCategoria(null);
      setCategoria('');
      setColore('#1976d2');
    }
    clearCategoriaErrors();
    setOpenCategoriaDialog(true);
  }, [clearCategoriaErrors]);

  const handleCloseCategoriaDialog = useCallback(() => {
    setOpenCategoriaDialog(false);
    setEditingCategoria(null);
    setCategoria('');
    setColore('#1976d2');
    clearCategoriaErrors();
  }, [clearCategoriaErrors]);

  const handleSaveCategoria = async () => {
    setLoading(true);
    const isValid = validateCategoria(
      { categoria },
      {
        categoria: { required: true, message: ERROR_MESSAGES.REQUIRED_FIELD('categoria') }
      }
    );
    
    if (!isValid) {
      setLoading(false);
      return;
    }

    // Se stiamo modificando e il nome della categoria è cambiato, controlla i corsi associati
    if (editingCategoria && editingCategoria.categoria !== categoria) {
      const associatedCorsi = corsi.filter(corso => corso.categoria === editingCategoria.categoria);
      
      if (associatedCorsi.length > 0) {
        setAffectedCorsi(associatedCorsi);
        setOpenConfirmDialog(true);
        setLoading(false);
        return;
      }
    }

    await saveCategoria();
  };

  const saveCategoria = useCallback(async () => {
    const categoriaData = { categoria, colore };

    const result = editingCategoria
      ? await updateCategoria(editingCategoria.id, categoriaData)
      : await createCategoria(categoriaData);
    
    if (!result.success && result.error?.code === '23505') {
      validateCategoria({ categoria }, {
        categoria: { 
          required: true, 
          message: 'Categoria già presente',
          customValidation: () => false
        }
      });
      setLoading(false);
      return;
    }
    
    if (result.success) {
      handleCloseCategoriaDialog();
    }
    setLoading(false);
  }, [categoria, colore, editingCategoria, updateCategoria, createCategoria, validateCategoria, handleCloseCategoriaDialog]);

  const handleConfirmProceed = useCallback(async () => {
    setOpenConfirmDialog(false);
    setLoading(true);
    await saveCategoria();
    setAffectedCorsi([]);
  }, [saveCategoria]);

  const handleConfirmCancel = useCallback(() => {
    setOpenConfirmDialog(false);
  }, []);

  const handleDeleteCategoria = async (id: string) => {
    const categoriaToRemove = categorie.find(c => c.id === id);
    if (!categoriaToRemove) return;
    
    const associatedCorsi = corsi.filter(corso => corso.categoria === categoriaToRemove.categoria);
    setAffectedCorsi(associatedCorsi);
    setCategoriaToDelete(id);
    setOpenDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (categoriaToDelete) {
      setLoading(true);
      await removeCategoria(categoriaToDelete);
      setOpenDeleteConfirmDialog(false);
      setCategoriaToDelete(null);
      setAffectedCorsi([]);
      setLoading(false);
    }
  }, [categoriaToDelete, removeCategoria]);

  const handleCancelDelete = useCallback(() => {
    setOpenDeleteConfirmDialog(false);
    setCategoriaToDelete(null);
    setAffectedCorsi([]);
  }, []);

  const categorieColumns = [
    { key: 'categoria', label: 'Categoria', width: '50%' },
    { 
      key: 'colore', 
      label: 'Colore', 
      width: '50%',
      format: (value: string) => value
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/orario-anno-accademico')}
          sx={{ color: 'primary.main' }}
          title="Torna a Orario Anno Accademico"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Categorie Corso
        </Typography>
      </Box>

      <DataTable
        title="Categorie"
        columns={categorieColumns}
        data={categorie}
        onAdd={() => handleOpenCategoriaDialog()}
        onEdit={handleOpenCategoriaDialog}
        onDelete={handleDeleteCategoria}
        emptyMessage="Nessuna categoria presente"
        renderCell={(row, column) => {
          if (column.key === 'colore') {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    backgroundColor: row.colore,
                    border: '1px solid #ccc'
                  }}
                />
                <span>{row.colore}</span>
              </Box>
            );
          }
          return undefined;
        }}
      />

      <Dialog open={openCategoriaDialog} onClose={handleCloseCategoriaDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategoria ? 'Modifica Categoria' : 'Nuova Categoria'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Categoria"
              fullWidth
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              error={!!categoriaErrors.categoria}
              helperText={categoriaErrors.categoria}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Colore
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  type="color"
                  value={colore}
                  onChange={(e) => setColore(e.target.value)}
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <TextField
                  value={colore}
                  onChange={(e) => setColore(e.target.value)}
                  size="small"
                  placeholder="#000000"
                  inputProps={{ maxLength: 7 }}
                  sx={{ width: '120px' }}
                />
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    backgroundColor: colore,
                    border: '1px solid #ccc'
                  }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoriaDialog}>Annulla</Button>
          <Button onClick={handleSaveCategoria} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (editingCategoria ? 'Salva' : 'Crea')}
          </Button>
        </DialogActions>
      </Dialog>

      <WarningDialog
        open={openConfirmDialog}
        title="ATTENZIONE!"
        message="Ci sono dei corsi associati a questa Categoria. Se procedi la modifica verrà applicata anche ai corsi:"
        items={affectedCorsi.map(corso => ({ id: corso.id, label: corso.nomeCorso }))}
        onConfirm={handleConfirmProceed}
        onCancel={handleConfirmCancel}
        confirmText="Procedi"
      />

      <WarningDialog
        open={openDeleteConfirmDialog}
        title={affectedCorsi.length > 0 ? 'ATTENZIONE!' : 'Conferma eliminazione'}
          message={
            affectedCorsi.length > 0
              ? 'Impossibile eliminare la categoria perché associata ai seguenti corsi:'
              : 'Sei sicuro di voler eliminare questa categoria?'
          }
          items={affectedCorsi.length > 0 ? affectedCorsi.map(corso => ({ id: corso.id, label: corso.nomeCorso })) : undefined}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          confirmText="Elimina"
          confirmColor="error"
          hideConfirm={affectedCorsi.length > 0}
      />
    </Container>
  );
};

export default GestioneTipologie;
