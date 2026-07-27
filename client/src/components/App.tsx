import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/system/ThemeProvider';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import theme from '../theme';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { RouterProvider, Router, type RouteDef } from '../context/RouterContext';

// component imports
import NavBar from './NavBar/NavBar';
import Posts from './Posts/Posts';
import Profile from './Profile/Profile';
import ModQueue from './Moderation/ModQueue';
import DMsList from './DMs/DMsList';
import DMs from './DMs/DMs';
import NotFound from './NotFound/NotFound';

const routes: RouteDef[] = [
  { path: '/', component: Posts },
  {
    path: '/moderation',
    component: ModQueue,
    requiresAuth: true,
    requiresRole: 'MODERATOR',
  },
  { path: '/profile', component: Profile, requiresAuth: true },
  { path: '/profile/:id', component: Profile },
  { path: '/dms', component: DMsList, requiresAuth: true },
  { path: '/dms/:id', component: DMs, requiresAuth: true },
];

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <RouterProvider>
            <NavBar />
            <Box
              component="main"
              sx={{
                pt: 16, pb: 8, backgroundColor: '#e1e5f8', minHeight: '100vh',
              }}
            >
              <Container maxWidth="md">
                <Router routes={routes} notFound={NotFound} />
              </Container>
            </Box>
          </RouterProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
