import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import { useToast } from '../../context/ToastContext';
import {
  hasCompletedLocationSetup,
  requestLocationSetup,
  useAuth,
} from '../../context/AuthContext';

export type TradeRequestStatusValue = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type TradeRequestData = {
  id: number;
  postId: number;
  requesterId: number;
  message: string | null;
  status: TradeRequestStatusValue;
  createdAt: string;
  post: { id: number; title: string; status: string; userId: number };
};

interface RequestTradeButtonProps {
  postId: number;
  myRequest: TradeRequestData | null;
  onRequestChanged: () => void | Promise<void>;
  open?: boolean;
  onClose?: () => void;
  hideButton?: boolean;
}

export default function RequestTradeButton({
  postId,
  myRequest,
  onRequestChanged,
  open: externalOpen,
  onClose,
  hideButton = false,
}: RequestTradeButtonProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const isPending = myRequest?.status === 'PENDING';
  const setupComplete = hasCompletedLocationSetup(user);
  const dialogOpen = setupComplete && (externalOpen ?? open);

  useEffect(() => {
    if (externalOpen && !setupComplete) {
      requestLocationSetup();
      onClose?.();
    }
  }, [externalOpen, setupComplete, onClose]);

  const handleOpen = () => {
    if (!setupComplete) {
      requestLocationSetup();
      return;
    }

    setOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    setMessage('');
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!hasCompletedLocationSetup(user)) {
      requestLocationSetup();
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/trade-requests', { postId, message: message.trim() || undefined });
      showToast('Trade request sent!', 'success');
      setOpen(false);
      setMessage('');
      onClose?.();
      await onRequestChanged();
    } catch (err) {
      const errMessage = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : 'Could not send trade request - try again.';
      showToast(errMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myRequest) return;
    setSubmitting(true);
    try {
      await axios.patch(`/trade-requests/${myRequest.id}/cancel`);
      showToast('Trade request withdrawn.', 'info');
      await onRequestChanged();
    } catch {
      showToast('Could not withdraw request - try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending) {
    return (
      <Button size="small" variant="outlined" color="inherit" disabled={submitting} onClick={handleWithdraw} sx={{ borderRadius: theme.radius.md, textTransform: 'none' }}>
        {submitting ? 'Withdrawing...' : 'Withdraw Request'}
      </Button>
    );
  }

  return (
    <>
      {!hideButton && (
        <Button variant="contained" onClick={handleOpen} sx={{ borderRadius: theme.radius.md, textTransform: 'none' }}>
          Request to Trade
        </Button>
      )}

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Request to Trade</DialogTitle>
        <DialogContent>
          <TextField
            label="Message (optional)"
            fullWidth
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{ mt: 1 }}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
