import React from 'react';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';

import { Link } from '../../context/RouterContext';

interface FooterProps {
  scrollingDown: boolean;
}

export default function Footer({ scrollingDown }: FooterProps) {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        px: { xs: 1, sm: 2 },
        py: 0.375,
        minHeight: { xs: 77, sm: 86 },
        display: 'flex',
        alignItems: 'center',
        transform: scrollingDown ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 0.2s ease',
      }}
    >
      <Box
        sx={{
          maxWidth: 850,
          width: '100%',
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: { xs: 1, sm: 2 },
          '& a': {
            color: 'text.primary',
            textDecoration: 'none',
            fontSize: { xs: '0.68rem', sm: '1.1rem' },
            whiteSpace: 'nowrap',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 2 },
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          <Avatar
            variant="rounded"
            src={new URL('../../assets/BartaMascot.png', import.meta.url).href}
            alt="Barta"
            sx={{
              width: { xs: 48, sm: 80 },
              height: { xs: 48, sm: 80 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />

          <Box
            sx={{
              color: 'link.main',
              fontSize: { xs: '0.68rem', sm: '1.15rem' },
              whiteSpace: 'nowrap',
            }}
          >
            Barter better with Barta.
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1.5 },
            flexWrap: 'nowrap',
            flexShrink: 0,
            mr: { xs: 0, sm: 1.5 },
          }}
        >
          <Link to="/terms">Terms</Link>

          <Box
            component="span"
            sx={{
              color: 'link.main',
              fontSize: { xs: '0.9rem', sm: '1.4rem' },
              lineHeight: 1,
            }}
          >
            |
          </Box>

          <Link to="/contact">Contact</Link>

          <Box
            component="span"
            sx={{
              color: 'link.main',
              fontSize: { xs: '0.9rem', sm: '1.4rem' },
              lineHeight: 1,
            }}
          >
            |
          </Box>

          <Link to="/help">Help</Link>
        </Box>
      </Box>
    </Box>
  );
}
