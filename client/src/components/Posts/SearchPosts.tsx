import React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';

interface SearchPostsProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
}

export default function SearchPosts({
  search,
  onSearchChange,
  onSubmit,
}: SearchPostsProps) {
  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        display: 'flex', gap: 1, mb: 3, px: { xs: 2, md: 0 },
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          display: 'flex', alignItems: 'center', px: 1.5, py: 0.25, flex: 1,
        }}
      >
        <InputBase
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search for listings..."
          sx={{ flex: 1, fontSize: '0.85rem' }}
        />
      </Paper>

      {/* Search Button */}
      <Button
        type="submit"
        variant="contained"
        sx={{ textTransform: 'none', fontWeight: 'bold' }}
      >
        Search
      </Button>
    </Box>
  );
}
