import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import router from './routes/router.js';

dotenv.config({ path: path.join('config', '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(process.cwd(), 'client', 'dist')));

app.use('/oauth2', router.auth);
app.use('/health', router.health);
app.use('/user', router.user);
app.use('/posts', router.posts);
app.use('/reports', router.reports);
app.use('/dms', router.dms);

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client', 'dist', 'index.html'));
});

app.listen(port, () => console.info(`Listening on http://localhost:${port}`));
