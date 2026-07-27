import React, { useState } from 'react';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useToast } from '../../context/ToastContext';

const reasons = [
  { value: 'SPAM_OR_SCAM', label: 'Spam or scam' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'ITEM_MISMATCH', label: "Item doesn't match description" },
  { value: 'OTHER', label: 'Other' },
];

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: 'POST' | 'USER' | 'MESSAGE';
  targetId: number;
}

export default function ReportDialog({
  open, onClose, targetType, targetId,
}: ReportDialogProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    showToast('Report submitted - running automatic screening...', 'info');
    try {
      await axios.post('/reports', {
        targetType, targetId, reason, details,
      }, { withCredentials: true });
      showToast('Screening complete. A neighbor moderator will confirm within 24 hours.', 'info');
      setReason('');
      setDetails('');
      onClose();
    } catch {
      showToast("Couldn't submit report - check your connection and try again.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Report this post</DialogTitle>
      <DialogContent>
        <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.map((r) => (
            <FormControlLabel key={r.value} value={r.value} control={<Radio />} label={r.label} />
          ))}
        </RadioGroup>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          placeholder="Anything else we should know? (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          sx={{ mt: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Reports run through automatic screening first, then a moderator confirms within 24 hours.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!reason || submitting} onClick={handleSubmit}>
          Submit report
        </Button>
      </DialogActions>
    </Dialog>
  );
}
