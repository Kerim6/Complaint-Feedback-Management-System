// server.js
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import complaintRoutes from './routes/complaints.js';
import staffRoutes from './routes/staff.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import notificationRoutes from './routes/notifications.js';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: false
  },
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', complaintRoutes);
app.use('/', staffRoutes);
app.use('/', adminRoutes);
app.use('/', publicRoutes);

  

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
