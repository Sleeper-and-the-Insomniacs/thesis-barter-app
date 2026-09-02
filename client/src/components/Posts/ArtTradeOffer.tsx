/* eslint-disable max-len */
import React, { useState, useRef } from 'react';
import axios from 'axios';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Modal from '@mui/material/Modal';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';

interface ArtTradeOfferProps {
  postId: number;
  onSuccess?: () => void;
  open?: boolean;
  onClose?: () => void;
  hideButton?: boolean;
}

// creates a watermark for the image preview
const createWatermark = (file: File, watermarkText?: string): Promise<Blob> => new Promise((resolve, reject) => {
  const sourceImage = new Image();

  sourceImage.onload = () => {
    const outputCanvas = document.createElement('canvas');
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) {
      reject(new Error('Canvas context error'));
      return;
    }

    const scaleFactor = Math.min(800 / sourceImage.width, 800 / sourceImage.height, 1);
    const scaledWidth = sourceImage.width * scaleFactor;
    const scaledHeight = sourceImage.height * scaleFactor;

    outputCanvas.width = scaledWidth;
    outputCanvas.height = scaledHeight;
    outputContext.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);

    if (watermarkText) {
      const watermarkFontSize = Math.max(24, Math.min(72, scaledWidth * 0.08));

      outputContext.font = `bold ${watermarkFontSize}px sans-serif`;
      outputContext.fillStyle = 'rgba(255, 255, 255, 0.4)';
      outputContext.textAlign = 'center';
      outputContext.textBaseline = 'middle';

      outputContext.fillText(
        watermarkText,
        scaledWidth / 2,
        scaledHeight / 2,
        scaledWidth * 0.8,
      );
    }

    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Blob failed'));
        }
      },
      'image/jpeg',
      0.85,
    );
  };

  sourceImage.onerror = () => {
    reject(new Error('Failed to load image'));
  };
  sourceImage.src = URL.createObjectURL(file);
});

export const ArtTradeOffer: React.FC<ArtTradeOfferProps> = ({
  postId,
  onSuccess,
  open: externalOpen,
  onClose,
  hideButton = false,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [addWatermark, setAddWatermark] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modalOpen = externalOpen ?? open;

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    if (!isSubmitting) {
      setOpen(false);
      setMessage('');
      setFile(null);
      setAddWatermark(false);
      setError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose?.();
    }
  };

  const uploadFileToS3 = async (
    fileOrBlob: File | Blob,
    filename: string,
    contentType: string,
    variant: 'PREVIEW' | 'FULL',
  ) => {
    const presignRes = await axios.post<{ uploadUrl: string; key: string }>('/media/presign', {
      filename,
      contentType,
    });
    const { uploadUrl, key } = presignRes.data;

    await axios.put(uploadUrl, fileOrBlob, {
      headers: { 'Content-Type': contentType },
    });

    const mediaRes = await axios.post<{ id: number }>('/media', {
      key,
      variant,
    });

    return mediaRes.data.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please attach an artwork file for trade.');
      return;
    }

    setIsSubmitting(true);
    try {
      const watermarkText = `@${user?.name ?? user?.email}`;
      const previewBlob = await createWatermark(
        file,
        addWatermark ? watermarkText : undefined,
      );
      const previewMediaId = await uploadFileToS3(previewBlob, `preview_${file.name}`, 'image/jpeg', 'PREVIEW');
      const fullMediaId = await uploadFileToS3(file, file.name, file.type, 'FULL');

      await axios.post(
        '/artTradeOffers',
        {
          postId,
          message,
          previewMediaId,
          fullMediaId,
        },
        { withCredentials: true },
      );

      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error submitting trade offer:', err);
      setError('An error occurred while uploading artwork.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {!hideButton && (
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Offer Art
        </Button>
      )}

      <Modal open={modalOpen} onClose={handleClose}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'surface.container.high', boxShadow: 3, p: 4, borderRadius: theme.radius.xl, display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          <Typography variant="h6">Make an Art Trade Offer</Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Offer Notes"
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            disabled={isSubmitting}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={isSubmitting}>
              Attach Artwork
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={(e) => {
                  setError('');
                  setFile(e.target.files?.[0] || null);
                }}
              />
            </Button>
            {file && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                {file.name}
              </Typography>
            )}
          </Box>

          <FormControlLabel
            control={(
              <Checkbox
                checked={addWatermark}
                disabled={isSubmitting}
                onChange={(e) => setAddWatermark(e.target.checked)}
              />
            )}
            label="Optional: Add Watermark of Username"
          />

          <Box sx={{
            display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1,
          }}
          >
            <Button onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || !file}>
              {isSubmitting ? <CircularProgress size={24} /> : 'Submit Offer'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ArtTradeOffer;
