/* eslint-disable max-len */
import React, { useState } from 'react';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';

import type { PostData } from './ManagePosts';

interface PostImageGalleryProps {
  post: PostData;
  isArtTrade: boolean;
}

export default function PostImageGallery({
  post,
  isArtTrade,
}: PostImageGalleryProps) {
  const theme = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const postImages = post.imageUrls ?? [];
  const currentPostImage = postImages[currentImageIndex] ?? postImages[0];
  const feedDigitalImage = post.previewUrl ?? null;

  let expandedImageUrl: string | null = currentPostImage ?? null;

  if (isArtTrade) {
    expandedImageUrl = post.previewUrl ?? null;

    if (post.status === 'COMPLETED') {
      expandedImageUrl = post.fullUrl ?? post.previewUrl ?? null;
    }
  }

  const handlePreviousImage = () => {
    setCurrentImageIndex((currentIndex) => (
      currentIndex === 0 ? postImages.length - 1 : currentIndex - 1
    ));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((currentIndex) => (
      currentIndex === postImages.length - 1 ? 0 : currentIndex + 1
    ));
  };

  return (
    <>
      {currentPostImage && (
        <Box sx={{ mb: 'clamp(6px, 1.5cqw, 12px)' }}>
          <Box
            sx={{
              position: 'relative',
              width: '88%',
              mx: 'auto',
              aspectRatio: '2.8 / 1',
              bgcolor: 'surface.sunken',
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={currentPostImage}
              alt={`Post ${currentImageIndex + 1}`}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />

            {postImages.length > 1 && (
              <>
                <IconButton
                  onClick={handlePreviousImage}
                  aria-label="Previous image"
                  sx={{
                    position: 'absolute',
                    left: '1.5%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 'clamp(22px, 4.5cqw, 40px)',
                    height: 'clamp(22px, 4.5cqw, 40px)',
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': {
                      bgcolor: 'background.paper',
                    },
                  }}
                >
                  <ChevronLeftIcon
                    sx={{
                      fontSize: 'clamp(14px, 2.5cqw, 24px)',
                    }}
                  />
                </IconButton>

                <IconButton
                  onClick={handleNextImage}
                  aria-label="Next image"
                  sx={{
                    position: 'absolute',
                    right: '1.5%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 'clamp(22px, 4.5cqw, 40px)',
                    height: 'clamp(22px, 4.5cqw, 40px)',
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': {
                      bgcolor: 'background.paper',
                    },
                  }}
                >
                  <ChevronRightIcon
                    sx={{
                      fontSize: 'clamp(14px, 2.5cqw, 24px)',
                    }}
                  />
                </IconButton>
              </>
            )}

            <IconButton
              onClick={() => setImageViewerOpen(true)}
              aria-label="Expand image"
              sx={{
                position: 'absolute',
                right: '1.5%',
                bottom: '3%',
                width: 'clamp(22px, 4.5cqw, 40px)',
                height: 'clamp(22px, 4.5cqw, 40px)',
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              <OpenInFullIcon
                sx={{
                  fontSize: 'clamp(14px, 2.5cqw, 24px)',
                }}
              />
            </IconButton>
          </Box>

          {postImages.length > 1 && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 'clamp(3px, 0.7cqw, 6px)',
                  mt: 'clamp(4px, 1cqw, 8px)',
                }}
              >
                {postImages.map((imageUrl, index) => (
                  <Box
                    key={`dot-${imageUrl}`}
                    onClick={() => setCurrentImageIndex(index)}
                    sx={{
                      width: index === currentImageIndex
                        ? 'clamp(12px, 2.25cqw, 18px)'
                        : 'clamp(5px, 0.9cqw, 7px)',
                      height: 'clamp(4px, 0.8cqw, 7px)',
                      borderRadius: theme.radius.pill,
                      bgcolor: index === currentImageIndex
                        ? 'primary.main'
                        : 'text.disabled',
                      cursor: 'pointer',
                      transition: 'width 0.2s ease',
                    }}
                  />
                ))}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'clamp(4px, 1cqw, 8px)',
                  mt: 'clamp(5px, 1.3cqw, 10px)',
                  overflowX: 'auto',
                  pb: 'clamp(2px, 0.5cqw, 4px)',
                }}
              >
                {postImages.map((imageUrl, index) => (
                  <Box
                    key={`thumbnail-${imageUrl}`}
                    onClick={() => setCurrentImageIndex(index)}
                    role="button"
                    tabIndex={0}
                    sx={{
                      width: 'clamp(38px, 8cqw, 72px)',
                      aspectRatio: '1 / 1',
                      flexShrink: 0,
                      borderRadius: theme.radius.sm,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: index === currentImageIndex
                        ? 'primary.main'
                        : 'border.default',
                      opacity: index === currentImageIndex ? 1 : 0.7,
                      transition: 'opacity 0.15s ease, border-color 0.15s ease',
                      '&:hover': {
                        opacity: 1,
                      },
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={`Post Thumbnail ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {feedDigitalImage && (
        <Box sx={{ mb: 'clamp(6px, 1.5cqw, 12px)' }}>
          <Box
            sx={{
              position: 'relative',
              width: '88%',
              mx: 'auto',
              aspectRatio: '2.8 / 1',
              bgcolor: 'surface.sunken',
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={feedDigitalImage}
              alt="Post Preview"
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />

            <IconButton
              onClick={() => setImageViewerOpen(true)}
              aria-label="Expand image"
              sx={{
                position: 'absolute',
                right: '1.5%',
                bottom: '3%',
                width: 'clamp(22px, 4.5cqw, 40px)',
                height: 'clamp(22px, 4.5cqw, 40px)',
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              <OpenInFullIcon
                sx={{
                  fontSize: 'clamp(14px, 2.5cqw, 24px)',
                }}
              />
            </IconButton>
          </Box>
        </Box>
      )}

      <Dialog
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        maxWidth="xl"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              height: '94vh',
              maxHeight: '94vh',
              bgcolor: 'background.default',
              borderRadius: theme.radius.md,
            },
          },
        }}
      >
        <DialogContent
          sx={{
            position: 'relative',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <IconButton
            onClick={() => setImageViewerOpen(false)}
            aria-label="Close image"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {postImages.length > 1 && (
            <IconButton
              onClick={handlePreviousImage}
              aria-label="Previous image"
              sx={{
                position: 'absolute',
                left: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          )}

          {expandedImageUrl && (
            <img
              src={expandedImageUrl}
              alt={`Expanded Post ${currentImageIndex + 1}`}
              decoding="async"
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(94vh - 48px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          )}

          {postImages.length > 1 && (
            <IconButton
              onClick={handleNextImage}
              aria-label="Next image"
              sx={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
