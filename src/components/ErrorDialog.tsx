import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorIcon from '@mui/icons-material/Error';

interface ErrorDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  closeText?: string;
}


const DEFAULT_CLOSE_TEXT = 'Chiudi';

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  title,
  message,
  onClose,
  closeText = DEFAULT_CLOSE_TEXT,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ErrorIcon sx={{ color: 'error.main', fontSize: 32 }} />
      {title}
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1">{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained" color="primary">
        {closeText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ErrorDialog;
