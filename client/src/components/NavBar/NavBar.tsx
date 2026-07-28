/* eslint-disable no-nested-ternary */
import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

import { Link, useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';

function NavBar() {
  const { path } = useRouter();
  const { user, loading, logout } = useAuth();

  const navLinks = [
    { to: '/profile', label: 'Profile' },
    { to: '/dms', label: 'DMs' },
    ...(user?.role === 'MODERATOR' || user?.role === 'ADMIN' ? [{ to: '/moderation', label: 'Mod Queue' }] : []),
  ];

  return (
    <AppBar position="fixed" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
      <Toolbar sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
        px: { xs: 1.5, sm: 3, md: 4 },
        gap: { xs: 1, sm: 2 },
        flexWrap: { xs: 'wrap', md: 'nowrap' },
      }}
      >

        {/* App Name (maybe logo later?) */}
        <Link to="/">
          <Typography
            variant="h6"
            color="primary.main"
            sx={{
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              flexShrink: 0,
            }}
          >
            BARTAAAAA
          </Typography>
        </Link>

        {/* Profile link */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          flexShrink: 0,
          order: { xs: 2, md: 3 },
        }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
          }}
          >
            {navLinks.map(({ to, label }) => {
              const active = to === '/'
                ? path === '/'
                : path.startsWith(to);
              return (
                <Link key={to} to={to}>
                  <Button
                    variant="text"
                    color={active ? 'primary' : 'inherit'}
                    size="small"
                    sx={{
                      minWidth: 'auto',
                      px: {
                        xs: '0.75rem',
                        sm: '0.875rem',
                      },
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {label}
                  </Button>
                </Link>
              );
            })}
          </Box>

          {/* Username + Avatar + Google Login / Logout */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: 1,
            borderLeft: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
          >
            {loading ? (
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            ) : user ? (
              <>
                <Avatar sx={{
                  width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.75rem',
                }}
                >
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {user.name ?? user.email}
                </Typography>
                <Button size="small" color="inherit" onClick={() => logout()} sx={{ fontSize: '0.75rem' }}>
                  Log out
                </Button>
              </>
            ) : (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                <a href="/oauth2/login">Sign in with Google</a>
              </Typography>
            )}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
