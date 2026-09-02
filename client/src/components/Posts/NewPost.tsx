/* eslint-disable max-len */
import React, { useState } from 'react';
import axios from 'axios';

import Autocomplete from '@mui/material/Autocomplete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import type { CatType, Cond } from '../../../../server/db/generated/browser';
import { isValidZipCode } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';

// type definitions
export interface PostFormData {
  title: string;
  offerType: CatType;
  category: string;
  description: string;
  condition?: Cond;
  isLocal: boolean;
  zipCode?: string;
  radiusMiles?: number;
  previewMediaId?: number;
  fullMediaId?: number;
  mediaIds?: number[];
}

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: PostFormData) => Promise<void>;
}

type FormState = {
  title: string;
  offerType: CatType;
  category: string;
  description: string;
  condition: Cond;
  isLocal: boolean;
  zipCode: string;
  radiusMiles: number;
};

const PRODUCT_CATEGORIES = [
  'Automotive Parts and Accessories',
  'Beauty and Personal Care',
  'Books',
  'Cards',
  'Clothing, Shoes and Accessories',
  'Collectibles',
  'Electronics',
  'Food and Perishable Items',
  'Health and Wellness',
  'Home and Kitchen',
  'Musical Instruments',
  'Office Products',
  'Pet Supplies',
  'Raw Materials and Scraps',
  'Sports and Outdoors',
  'Tools and Home Improvement',
  'Toys and Games',
  'Video Games and Consoles',
];

const SERVICE_CATEGORIES = [
  'Carpentry',
  'Copywriting and Editing',
  'Digital Design',
  'Dog Walking',
  'IT Support',
  'Landscaping and Yard Work',
  'Language Tutoring',
  'Local Delivery',
  'Math Tutoring',
  'Moving Assistance',
  'Musical Tutoring',
  'Pet Sitting',
  'Photography and Videography',
  'Repairs',
  'Science Tutoring',
  'Technical Writing',
  'Translation Services',
];

const DIGITAL_CATEGORIES = [
  '3D Modeling',
  'Art Studies',
  'Character Concept Art',
  'Character Design',
  'Comics',
  'Digital Drawings',
  'Digital Paintings',
  'Environments and Landscapes',
  'Fan Art',
  'Graphic Design',
  'Graphic Novel',
  'Photography',
  'Pixel and Retro Art',
  'Typography',
  'Vector Art',
  'Videogame Design Art',
  'Webtoons',
];

const CATEGORY_OPTIONS: Record<CatType, string[]> = {
  PRODUCT: PRODUCT_CATEGORIES,
  SERVICE: SERVICE_CATEGORIES,
  DIGITAL: DIGITAL_CATEGORIES,
};

const initialForm: FormState = {
  title: '',
  offerType: 'PRODUCT',
  category: '',
  description: '',
  condition: 'GOOD',
  isLocal: false,
  zipCode: '',
  radiusMiles: 15,
};

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

export default function CreatePostModal({
  open,
  onClose,
  onSubmit,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [postImages, setPostImages] = useState<File[]>([]);
  const [addWatermark, setAddWatermark] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // change handler
  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormData((prev) => {
      const updates: Partial<FormState> = { [field]: value };
      if (field === 'offerType') {
        updates.category = '';
        if (value === 'DIGITAL') {
          updates.isLocal = false;
        }
      }
      return { ...prev, ...updates };
    });
  };

  // close and reset the form
  const handleClose = () => {
    setFormData(initialForm);
    setFile(null);
    setPostImages([]);
    setAddWatermark(false);
    onClose();
  };

  const uploadFileToS3 = async (
    fileOrBlob: File | Blob,
    filename: string,
    contentType: string,
    variant?: 'PREVIEW' | 'FULL',
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
      ...(variant && { variant }),
    });

    return mediaRes.data.id;
  };

  // check for valid data
  const zipError = formData.isLocal && Boolean(formData.zipCode.trim()) && !isValidZipCode(formData.zipCode);
  const isInvalid = (
    !formData.title.trim()
    || !formData.category.trim()
    || !formData.description.trim()
    || (formData.isLocal && !isValidZipCode(formData.zipCode))
    || (formData.offerType === 'DIGITAL' && !file)
  );

  // submit handler for the form
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isInvalid) return;

    setIsSubmitting(true);
    try {
      let previewMediaId: number | undefined;
      let fullMediaId: number | undefined;
      let mediaIds: number[] | undefined;

      if (formData.offerType === 'DIGITAL' && file) {
        const watermarkText = `@${user?.name ?? user?.email}`;
        const previewBlob = await createWatermark(
          file,
          addWatermark ? watermarkText : undefined,
        );
        previewMediaId = await uploadFileToS3(previewBlob, `preview_${file.name}`, 'image/jpeg', 'PREVIEW');
        fullMediaId = await uploadFileToS3(file, file.name, file.type, 'FULL');
      }

      if (formData.offerType !== 'DIGITAL' && postImages.length > 0) {
        mediaIds = await Promise.all(
          postImages.map((postImage) => (
            uploadFileToS3(postImage, postImage.name, postImage.type)
          )),
        );
      }

      await onSubmit({
        title: formData.title.trim(),
        offerType: formData.offerType,
        category: formData.category.trim(),
        description: formData.description.trim(),
        condition: formData.offerType === 'PRODUCT' ? formData.condition : undefined,
        isLocal: formData.isLocal,
        zipCode: formData.isLocal ? formData.zipCode.trim() : undefined,
        radiusMiles: formData.isLocal ? formData.radiusMiles : undefined,
        previewMediaId,
        fullMediaId,
        mediaIds,
      });

      setFormData(initialForm);
      setFile(null);
      setPostImages([]);
      setAddWatermark(false);
      onClose();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Trade Post</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Title */}
            <TextField
              label="Post Title"
              fullWidth
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={isSubmitting}
            />

            {/* Type of Offer */}
            <RadioGroup
              row
              value={formData.offerType}
              onChange={(e) => handleChange('offerType', e.target.value as CatType)}
            >
              <FormControlLabel value="PRODUCT" control={<Radio disabled={isSubmitting} />} label="Item" />
              <FormControlLabel value="SERVICE" control={<Radio disabled={isSubmitting} />} label="Service" />
              <FormControlLabel value="DIGITAL" control={<Radio disabled={isSubmitting} />} label="Digital Trade" />
            </RadioGroup>

            {/* Category */}
            <Autocomplete
              freeSolo
              options={CATEGORY_OPTIONS[formData.offerType]}
              inputValue={formData.category}
              onInputChange={(_, value) => handleChange('category', value)}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField
                  id={params.id}
                  disabled={params.disabled}
                  size={params.size}
                  slotProps={{
                    inputLabel: params.slotProps.inputLabel,
                    input: params.slotProps.input,
                    htmlInput: params.slotProps.htmlInput,
                  }}
                  label="Category"
                  fullWidth
                  required
                />
              )}
            />

            {/* Digital Trade File Upload */}
            <Collapse in={formData.offerType === 'DIGITAL'} unmountOnExit>
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={isSubmitting}>
                    Attach Artwork
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  {file && (
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {file.name}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Select an image (.jpg, .jpeg, .png, .webp, .gif, .bmp, .avif, and .svg file types are supported).
                  </Typography>
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
              </>
            </Collapse>

            {/* Post Image Upload */}
            <Collapse in={formData.offerType !== 'DIGITAL'} unmountOnExit>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={isSubmitting}>
                  Attach Images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => setPostImages(Array.from(e.target.files ?? []).slice(0, 5))}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {postImages.length > 0 ? `${postImages.length} of 5 images selected` : 'Select up to 5 images (.jpg, .jpeg, .png, .webp, .gif, .bmp, .avif, and .svg file types are supported).'}
                </Typography>
              </Box>
            </Collapse>

            {/* Description */}
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              required
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isSubmitting}
            />

            {/* Condition (Product Only) */}
            <Collapse in={formData.offerType === 'PRODUCT'} unmountOnExit>
              <FormControl fullWidth disabled={isSubmitting}>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={formData.condition}
                  label="Condition"
                  onChange={(e) => handleChange('condition', e.target.value)}
                >
                  <MenuItem value="POOR">Poor</MenuItem>
                  <MenuItem value="AVERAGE">Average</MenuItem>
                  <MenuItem value="GOOD">Good</MenuItem>
                  <MenuItem value="EXCELLENT">Excellent</MenuItem>
                  <MenuItem value="MINT">Mint</MenuItem>
                </Select>
              </FormControl>
            </Collapse>

            {/* Zip Code & Radius */}
            <Collapse in={formData.isLocal && formData.offerType !== 'DIGITAL'} unmountOnExit>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label="Zip Code"
                    fullWidth
                    required
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    disabled={isSubmitting}
                    error={zipError}
                    helperText={zipError ? 'Enter a valid zip code' : ' '}
                  />
                </Grid>
                <Grid size={6}>
                  <FormControl fullWidth disabled={isSubmitting}>
                    <InputLabel>Max Distance</InputLabel>
                    <Select
                      value={formData.radiusMiles}
                      label="Max Distance"
                      onChange={(e) => handleChange('radiusMiles', Number(e.target.value))}
                    >
                      <MenuItem value={5}>Within 5 miles</MenuItem>
                      <MenuItem value={15}>Within 15 miles</MenuItem>
                      <MenuItem value={30}>Within 30 miles</MenuItem>
                      <MenuItem value={50}>Within 50 miles</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Collapse>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isInvalid || isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Create Post'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
