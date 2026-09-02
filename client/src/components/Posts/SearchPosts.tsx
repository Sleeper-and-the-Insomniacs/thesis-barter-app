import React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

interface SearchPostsProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
  onAdvancedSearchClick: () => void;
}

export default function SearchPosts({
  search,
  onSearchChange,
  onSubmit,
  onAdvancedSearchClick,
}: SearchPostsProps) {
  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        position: 'sticky', top: { xs: 77, sm: 86 }, zIndex: 10, bgcolor: 'background.default', py: 1, display: 'flex', gap: 1, mb: 3, px: { xs: 2, md: 0 }, opacity: 'var(--header-scroll-opacity, 1)', transform: 'var(--header-scroll-transform, translateY(0))', pointerEvents: 'var(--header-scroll-pointer-events, auto)', transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          display: 'flex', alignItems: 'center', px: 1.5, py: 0.25, flex: 1,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
          }}
        >
          <InputBase
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search for listings..."
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.85rem',
              pr: search ? 4 : 0,
            }}
          />

          {search.length > 0 && (
            <IconButton
              type="button"
              size="small"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              sx={{
                position: 'absolute',
                right: 2,
                p: 0.25,
                color: 'text.secondary',
              }}
            >
              <CloseIcon
                sx={{
                  fontSize: '1rem',
                }}
              />
            </IconButton>
          )}
        </Box>

        <IconButton
          type="button"
          color="primary"
          aria-label="Advanced search"
          onClick={onAdvancedSearchClick}
        >
          <MenuIcon />
        </IconButton>
      </Paper>

      {/* Search Button */}
      <Button
        type="submit"
        variant="contained"
        sx={{ textTransform: 'none' }}
      >
        Search
      </Button>
    </Box>
  );
}
