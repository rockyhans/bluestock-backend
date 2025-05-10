import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import userModel from '../models/user.model.js';
import crypto from 'crypto';

const OAuth = express.Router();

// State management utilities
const stateStore = new Map();

const generateStateToken = (purpose, redirectUrl) => {
  const token = crypto.randomBytes(16).toString('hex');
  stateStore.set(token, {
    purpose,
    redirectUrl,
    createdAt: Date.now()
  });
  return token;
};

const validateStateToken = (token) => {
  const stateData = stateStore.get(token);
  if (!stateData) return null;

  // Clean expired states (15 minute TTL)
  const now = Date.now();
  stateStore.forEach((value, key) => {
    if (now - value.createdAt > 900000) stateStore.delete(key);
  });

  stateStore.delete(token);
  return stateData;
};

// Environment validation
const verifyEnvironment = () => {
  const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
  requiredEnvVars.forEach(env => {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  });
};

try {
  verifyEnvironment();
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}

// Passport Configuration
OAuth.use(passport.initialize());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true,
},
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const stateData = validateStateToken(req.query.state);
      if (!stateData) return done(new Error('Invalid state token'));

      const { purpose, redirectUrl } = stateData;
      const email = profile.emails?.[0]?.value;
      const existingUser = await userModel.findOne({ googleId: profile.id });

      // Login flow
      if (purpose === 'login') {
        if (existingUser) {
          console.log(`[LOGIN SUCCESS] User ${email} logged in via Google`);
          return done(null, existingUser);
        }

        // Try to find by email and link account
        const userByEmail = await userModel.findOne({ email });
        if (userByEmail) {
          userByEmail.googleId = profile.id;
          await userByEmail.save();
          console.log(`[LOGIN SUCCESS] Existing user ${email} linked Google account`);
          return done(null, userByEmail);
        }
        return done(new Error('No account found. Please sign up first.'));
      }

      // Signup flow
      if (purpose === 'signup') {
        if (existingUser) {
          return done(new Error('Account already exists. Please login instead.'));
        }

        const userByEmail = await userModel.findOne({ email });
        if (userByEmail) {
          return done(new Error('Email already in use. Please login instead.'));
        }

        const newUser = await userModel.create({
          googleId: profile.id,
          email,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          provider: 'google'
        });

        console.log(`[SIGNUP SUCCESS] New user ${email} created via Google OAuth`);
        return done(null, newUser);
      }

      return done(new Error('Invalid authentication purpose'));
    } catch (error) {
      console.error(`[AUTH ERROR] ${error.message}`);
      return done(error);
    }
  }
));

// Session management
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Authentication routes
OAuth.get('/account/google/login', (req, res) => {
  const state = generateStateToken('login', req.query.redirectUrl || '/');
  const authUrl = `${process.env.GOOGLE_AUTH_URL
    }?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID
    }&scope=profile email&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)
    }&state=${state}&access_type=online&prompt=select_account`;

  res.redirect(authUrl);
});

OAuth.get('/account/google/signup', (req, res) => {
  const state = generateStateToken('signup', req.query.redirectUrl || '/welcome');
  const authUrl = `${process.env.GOOGLE_AUTH_URL
    }?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID
    }&scope=profile email&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)
    }&state=${state}&access_type=online&prompt=select_account`;

  res.redirect(authUrl);
});

// Callback handler
OAuth.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${'https://visit-blue-stock.vercel.app'}`
  }),
  (req, res) => {
    const redirectUrl = req.session.returnTo ||
      req.user.redirectUrl ||
      `${'https://visit-blue-stock.vercel.app'}/Ragister-IPO-Details-And-Dasboard`;
    console.log(`[AUTH REDIRECT] User ${req.user.email} redirected to ${redirectUrl}`);
    res.redirect(redirectUrl);
  }
);

// Session verification endpoints
OAuth.get('/verify-session', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar
    }
  });
});

OAuth.get('/account/status', (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      provider: req.user.provider
    } : null
  });
});

// Error handling middleware
OAuth.use((err, req, res, next) => {
  console.error('Auth error:', err);

  const errorTypes = {
    'Invalid state token': 'invalid_state',
    'No account found': 'no_account',
    'Account already exists': 'account_exists',
    'Email already in use': 'email_in_use'
  };

  const errorType = errorTypes[err.message] || 'auth_failed';
  const frontendUrl = 'https://visit-blue-stock.vercel.app';

  res.redirect(`${frontendUrl}?type=${errorType}`);
});

export default OAuth;