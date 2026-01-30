import React, { useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface SuccessDialogProps {
  open: boolean;
  message?: string;
  onClose: () => void;
  autoHideDuration?: number;
}

const DEFAULT_MESSAGE = 'Operazione eseguita con successo!';
const SuccessDialog: React.FC<SuccessDialogProps> = ({
  open,
  message = DEFAULT_MESSAGE,
  onClose,
  autoHideDuration = 1500,
}) => {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoHideDuration);
    return () => clearTimeout(timer);
  }, [open, autoHideDuration, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent
        sx={{
          bgcolor: 'success.light',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2,
        }}
      >
        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.contrastText' }}>
            {message}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'flex-end', py: 1 }}>
        <Button onClick={onClose} size="small" variant="contained" color="success">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuccessDialog;
