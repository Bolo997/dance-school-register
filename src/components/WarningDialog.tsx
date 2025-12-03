import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import WarningIcon from '@mui/icons-material/Warning';

interface WarningDialogProps {
  open: boolean;
  title: string;
  message: string;
  items?: { id: string; label: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'error' | 'primary';
  hideConfirm?: boolean;
}


const DEFAULT_CONFIRM_TEXT = 'Procedi';
const DEFAULT_CANCEL_TEXT = 'Annulla';
const DEFAULT_CONFIRM_COLOR: 'error' | 'primary' = 'error';

const WarningDialog: React.FC<WarningDialogProps> = ({
  open,
  title,
  message,
  items,
  onConfirm,
  onCancel,
  confirmText = DEFAULT_CONFIRM_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  confirmColor = DEFAULT_CONFIRM_COLOR,
  hideConfirm = false,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningIcon sx={{ color: 'warning.main', fontSize: 32 }} />
      {title}
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1" sx={{ mb: items ? 2 : 0 }}>
        {message}
      </Typography>
      {items && items.length > 0 && (
        <Box component="ul" sx={{ pl: 2 }}>
          {items.map((item) => (
            <li key={item.id}>
              <Typography variant="body2">{item.label}</Typography>
            </li>
          ))}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} sx={{ color: 'text.secondary' }}>
        {cancelText}
      </Button>
      {!hideConfirm && (
        <Button onClick={onConfirm} variant="contained" color={confirmColor}>
          {confirmText}
        </Button>
      )}
    </DialogActions>
  </Dialog>
);

export default WarningDialog;
