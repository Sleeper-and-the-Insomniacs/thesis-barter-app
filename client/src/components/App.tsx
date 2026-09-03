import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/system/ThemeProvider';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import getTheme from '../theme';
import { AuthProvider, MODERATOR_ROLES } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { RouterProvider, Router, type RouteDef } from '../context/RouterContext';
import { SocketProvider } from '../context/SocketContext';
import { NotificationProvider } from '../context/NotificationContext';

// component imports
import NavBar from './NavBar/NavBar';
import Posts from './Posts/Posts';
import Profile from './Profile/Profile';
import ModQueue from './Moderation/ModQueue';
import BlockedUsers from './BlockedUsers/BlockedUsers';
import NotFound from './NotFound/NotFound';
import Messages from './DMs/Messages';
import DeletedConversations from './DMs/DeletedConversations';
import LocationSetupModal from './Location/LocationSetupModal';
import Footer from './Footer/Footer';
import Terms from './Footer/Terms';
import Contact from './Footer/Contact';
import Help from './Footer/Help';

const routes: RouteDef[] = [
  { path: '/', component: Posts },
  {
    path: '/moderation',
    component: ModQueue,
    requiresAuth: true,
    requiresRole: [...MODERATOR_ROLES],
  },
  { path: '/blocked-users', component: BlockedUsers, requiresAuth: true },
  { path: '/profile', component: Profile, requiresAuth: true },
  { path: '/profile/:id', component: Profile },
  { path: '/profile/offers/:offerId', component: Profile },
  { path: '/profile/history/:postId', component: Profile },
  { path: '/profile/reviews/:reviewId', component: Profile },
  { path: '/profile/requests/:postId/:requestId', component: Profile },
  { path: '/trade/:postId', component: Posts },
  { path: '/messages', component: Messages, requiresAuth: true },
  { path: '/messages/:id', component: Messages, requiresAuth: true },
  { path: '/deleted-conversations', component: DeletedConversations, requiresAuth: true },
  { path: '/terms', component: Terms },
  { path: '/contact', component: Contact },
  { path: '/help', component: Help },
];

function AppShell() {
  const { mode, contrast } = useSettings();
  const theme = useMemo(() => getTheme(mode, contrast), [mode, contrast]);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [scrollingDown, setScrollingDown] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;

    if (!footer) return undefined;

    const updateFooterHeight = () => {
      setFooterHeight(footer.offsetHeight);
    };

    updateFooterHeight();

    const observer = new ResizeObserver(updateFooterHeight);
    observer.observe(footer);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setScrollingDown(false);
      } else if (currentScrollY > lastScrollYRef.current) {
        setScrollingDown(true);
      } else if (currentScrollY < lastScrollYRef.current) {
        setScrollingDown(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <RouterProvider>
                <NavBar scrollingDown={scrollingDown} />
                <LocationSetupModal />

                <Box
                  component="main"
                  sx={{
                    '--header-scroll-opacity': scrollingDown ? '0' : '1',
                    '--header-scroll-transform': scrollingDown
                      ? 'translateY(calc(-100% - 8px))'
                      : 'translateY(0)',
                    '--header-scroll-pointer-events': scrollingDown ? 'none' : 'auto',
                    pt: 16,
                    pb: footerHeight > 0
                      ? `calc(${theme.spacing(8)} + ${footerHeight}px)`
                      : 8,
                    backgroundColor: 'background.default',
                    minHeight: '100vh',
                  }}
                >
                  <Container maxWidth="md">
                    <Router routes={routes} notFound={NotFound} />
                  </Container>
                </Box>

                <Box
                  ref={footerRef}
                  className="mui-fixed"
                  sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: theme.zIndex.appBar,
                    pointerEvents: scrollingDown ? 'none' : 'auto',
                  }}
                >
                  <Footer scrollingDown={scrollingDown} />
                </Box>
              </RouterProvider>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

export default App;
