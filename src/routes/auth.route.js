// traditiona auth done (no problem)
import express from 'express';
import bcrypt from 'bcryptjs';

import CustomError from '../util/customError.util.js';
import userModel from '../models/user.model.js';
import { verifyRecaptcha } from '../middlewares/verifyRecaptcha.js';

const traditionalAuth = express.Router();

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      // console.log('Login attempt failed: Missing email or password');
      throw new CustomError("Invalid credentials!", 400);
    }

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      // console.log(`Login attempt failed: User with email ${email} not found`);
      throw new CustomError("Invalid credentials!", 401);
    }

    const isMatchedPassword = await bcrypt.compare(password, user.password);
    if (!isMatchedPassword) {
      // console.log(`Login attempt failed: Incorrect password for user ${email}`);
      throw new CustomError("Invalid credentials!", 401);
    }

    if (rememberMe) {
      // Persistent session: set maxAge manually
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      // Session cookie: browser will delete on close
      req.session.cookie.expires = false;
    }

    // Store user in session
    req.session.user = {
      _id: user._id,
      email: user.email,
      name: user.name
    };

    // Save the session
    req.session.save(err => {
      if (err) {
        // console.error('Session save error:', err);
        throw new CustomError("Session error occured!", 500);
      }

      // console.log('\n=== Successful Login ===');
      // console.log(`User: ${user.email}`);
      // console.log('Session created with ID:', req.sessionID);

      user.password = undefined;

      return res.status(200).json({
        success: true,
        message: "Login successful!",
        user
      });
    });

  } catch (error) {
    next(error);
  }
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      // console.log('Signup attempt failed: Missing fields');
      throw new CustomError("Invalid credentials!", 400);
    }

    const isDuplicate = await userModel.findOne({ email });
    if (isDuplicate) {
      // console.log(`Signup attempt failed: Email ${email} already exists`);
      throw new CustomError("Email already exists!", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword
    });

    // Store user in session
    req.session.user = {
      _id: user._id,
      email: user.email,
      name: user.name
    };

    // Save the session
    req.session.save(err => {
      if (err) {
        // console.error('Session save error:', err);
        throw new CustomError("Session error occured!", 500);
      }

      user.password = undefined;

      // console.log('\n=== Successful Signup ===');
      // console.log(`New user: ${user.email}`);

      return res.status(201).json({
        success: true,
        message: "User registered successfully!",
        user
      });
    });

  } catch (error) {
    next(error);
  }
};

// session verification endpoint
export const verifySession = (req, res) => {
  if (req.session.user) {
    return res.status(200).json({
      success: true,
      user: req.session.user
    });
  }
  res.status(401).json({
    success: false,
    message: "Not authenticated"
  });
};


traditionalAuth.post('/login', verifyRecaptcha, login); // endpoint -> '/auth/login'
traditionalAuth.post('/signup', verifyRecaptcha, signup); // endpoint -> '/auth/signup'
traditionalAuth.get('/verify-session', verifySession);

export default traditionalAuth;