import express from 'express';
import dotenv from 'dotenv/config';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createWriteStream } from 'fs';
import { join } from 'path';
import morgan from 'morgan';
import passport from 'passport';

import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { sessionMiddleware } from './config/session.config.js';
import { sanitizeMongo } from './middlewares/mongodbSanitizer.middleware.js';
import connectDB from './config/database.config.js';
import traditionalAuth from './routes/auth.route.js';
import OAuth from './config/passport.js';
import { sharedLogout } from './controllers/logout.controller.js';
import password from './routes/passwordManagement.route.js'
import ipo from './routes/ipo.route.js'

const app = express();

// ======================================
// 1. GLOBAL MIDDLEWARE STACK
// ======================================

// Trust Ngrok's proxy (ngrok acting as a reverse proxy)
app.set('trust proxy', 1); // Or use `1` if behind only Ngrok

// Disable unwanted headers
app.disable('x-powered-by');
app.disable('etag');

// 1. Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  const accessLogStream = createWriteStream(
    join(process.cwd(), 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// 2. Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 3. Cookie parser
app.use(cookieParser());

// session middleware
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// 4. Security middlewares
app.use(helmet());
app.use(hpp());

// custom mongoDB sanitizer
app.use(sanitizeMongo);

// 5. Block suspicious paths
app.use(['/home', '/lib', '/server', '/wp-app.log'], (req, res) => res.status(404).end());

// 6. CORS configuration
const allowedOrigins = [process.env.TEST_FRONTEND_URL, process.env.FRONTEND_URL]; // just added a test frontend url. Remove it later
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));

// 7. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true }
});
app.use(limiter);

// 8. Compression (gzip)
app.use(compression());

// ======================================
// 2. ROUTES
// ======================================

// Test route
app.get('/test', (req, res) => {
  res.send("Hello from backend!");
});

// OAuth routes
app.use('/OAuth', OAuth);
// traditional routes
app.use('/auth', traditionalAuth);

// common logout route for both traditional and passport
app.post('/auth/logout', sharedLogout);

// route to handle password
app.use('/password', password);

// route to handle ipo
app.use('/ipo', ipo);

// ======================================
// 3. ERROR HANDLING
// ======================================
app.use('/', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

app.use(errorHandler);

// ======================================
// 4. SERVER INITIALIZATION
// ======================================
const PORT = process.env.PORT || 4001;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;