/* eslint-disable max-len */
/* eslint-disable no-nested-ternary */
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import MessageIcon from '@mui/icons-material/Message';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import Fab from '@mui/material/Fab';
import axios from 'axios';

import PersonIcon from '@mui/icons-material/Person';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, useRouter } from '../../context/RouterContext';
import SettingsMenu from './SettingsMenu';
import NotificationBell from './NotificationBell';
import { useAuth, isModerator } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import NewPost, { type PostFormData } from '../Posts/NewPost';
import UserAvatar from '../common/UserAvatar';

interface NavBarProps {
  scrollingDown: boolean;
}

function NavBar({ scrollingDown }: NavBarProps) {
  const { navigate } = useRouter();
  const { user, loading, logout } = useAuth();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [userMenuTarget, setUserMenuTarget] = useState<null | HTMLElement>(null);

  // create a post
  const handleCreatePost = async (formData: PostFormData) => {
    showToast('Post submitted - running automatic screening...', 'info');
    try {
      await axios.post('/posts', {
        title: formData.title,
        offerType: formData.offerType,
        category: formData.category,
        message: formData.description,
        condition: formData.condition,
        isLocal: formData.isLocal,
        zipCode: formData.zipCode,
        radiusMiles: formData.radiusMiles,
        previewMediaId: formData.previewMediaId,
        fullMediaId: formData.fullMediaId,
        mediaIds: formData.mediaIds,
      });

      showToast('Screening complete. Your post is live', 'success');
    // Adds in 'violates community guidelines' message for a rejected post during pre-screen
    } catch (requestError) {
      console.error('Failed to create post:', requestError);
      const message = axios.isAxiosError(requestError) && requestError.response?.data?.error
        ? requestError.response.data.error
        : 'Could not create post - check your connection and try, try again.';
      showToast(message, 'error');
      throw requestError;
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={2}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          opacity: scrollingDown ? 0.88 : 1,
          backdropFilter: scrollingDown ? 'blur(12px) saturate(160%)' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      >
        <Toolbar sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1,
          px: { xs: 1.5, sm: 3, md: 4 },
          gap: { xs: 1, sm: 2 },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          maxWidth: 'md',
          width: '100%',
          mx: 'auto',
          minHeight: { xs: 77, sm: 86 },
        }}
        >

          {/* App Name (maybe logo later?) */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Box
              component="img"
              src={new URL('../../assets/BartaNoBackground.png', import.meta.url).href}
              alt="Barta"
              sx={{
                height: { xs: 52, sm: 60 },
                width: 'auto',
                display: 'block',
              }}
            />
          </Link>

          {/* Username + Avatar + modal with: Google Login / Logout + Accessibility Settings + Profile link */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
          >

            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                '& .MuiIconButton-root': {
                  width: 36,
                  height: 36,
                  color: 'primary.contrastText',
                },
              }}
            >
              <SettingsMenu />
            </Box>

            {loading ? (
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            ) : (
              <>
                {user && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    {/* Notification Bell - standalone, hidden for guests */}
                    <NotificationBell filled />

                    <IconButton
                      onClick={(e) => setUserMenuTarget(e.currentTarget)}
                      aria-label="Account menu"
                      aria-haspopup="true"
                      aria-expanded={Boolean(userMenuTarget)}
                      sx={{ p: 0, width: 36, height: 36 }}
                    >
                      <UserAvatar user={user} size={36} sx={{ fontSize: '0.8rem' }} />
                    </IconButton>
                  </Box>
                )}

                {!user && (
                  <Box
                    onClick={() => { window.location.href = '/oauth2/login'; }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                    }}
                  >
                    <LoginIcon sx={{ fontSize: '1.25rem' }} />

                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}
                    >
                      Sign in with Google
                    </Typography>
                  </Box>
                )}

                <Menu
                  anchorEl={userMenuTarget}
                  open={Boolean(userMenuTarget)}
                  onClose={() => setUserMenuTarget(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  autoFocus={false}
                  disableAutoFocusItem
                >
                  {user && (
                    <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {user.name ?? user.email}
                      </Typography>
                    </Box>
                  )}

                  {/* Profile only visible when logged in */}
                  {user && (
                    <MenuItem onClick={() => { setUserMenuTarget(null); navigate('/profile'); }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: '1.25rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Profile
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}

                  {/* Messages only visible when logged in */}
                  {user && (
                    <MenuItem onClick={() => { setUserMenuTarget(null); navigate('/messages'); }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MessageIcon sx={{ fontSize: '1.25rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Messages
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}

                  {/* Deleted Conversations Item */}
                  {user && (
                    <MenuItem onClick={() => { setUserMenuTarget(null); navigate('/deleted-conversations'); }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Deleted Conversations
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}

                  {/* Blocked Users Item */}
                  {user && (
                    <MenuItem onClick={() => { setUserMenuTarget(null); navigate('/blocked-users'); }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonOffIcon sx={{ fontSize: '1.25rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Blocked Users
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}

                  {/* Moderation Queue Item - moderators/admins only, hidden otherwise */}
                  {isModerator(user?.role ?? null) && (
                    <MenuItem onClick={() => { setUserMenuTarget(null); navigate('/moderation'); }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GavelIcon sx={{ fontSize: '1.25rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Moderation Queue
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}

                  {/* Log out when logged in / Sign in with Google when logged out */}
                  {user && (
                    <MenuItem onClick={() => { setUserMenuTarget(null); logout(); }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LogoutIcon sx={{ fontSize: '1.25rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Log out
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* New Post Button (floating, renders on log in) */}
      {user && window.location.pathname === '/' && (
        <Box
          className="mui-fixed"
          sx={{
            position: 'fixed',
            bottom: { xs: 118, sm: 128 },
            right: {
              xs: 16,
              sm: 'max(32px, calc((100vw - 900px) / 2 - 44px))',
            },
            zIndex: (theme) => theme.zIndex.appBar + 10,
          }}
        >
          <Fab
            variant="extended"
            color="primary"
            onClick={() => setModalOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 3,
              opacity: scrollingDown ? 0.15 : 1,
              transition: 'opacity 0.2s ease',
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <AddIcon />
          </Fab>
        </Box>
      )}

      {/* NewPost Modal */}
      <NewPost
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </>
  );
}

export default NavBar;
