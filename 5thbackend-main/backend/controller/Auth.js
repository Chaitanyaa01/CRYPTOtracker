import User from '../Model/User.js';
import jwt from 'jsonwebtoken';
import { getFirebaseAuth } from '../config/firebaseAdmin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  authProvider: user.authProvider,
  emailVerified: user.emailVerified,
});

const buildUsername = async (email, displayName) => {
  const rawBase = displayName || email.split('@')[0] || 'trader';
  const base = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24) || 'trader';

  let candidate = base.length >= 3 ? base : `${base}user`;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    const trimmed = base.slice(0, 24 - String(suffix).length);
    candidate = `${trimmed}${suffix}`;
    suffix += 1;
  }

  return candidate;
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists',
      });
    }

    const user = new User({
      username,
      email,
      password,
      authProvider: 'local',
    });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      errorCode: isProduction ? undefined : error.code,
      detail: isProduction ? undefined : error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

export const firebaseLogin = async (req, res) => {
  try {
    const { idToken, username } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required',
      });
    }

    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Firebase account must include an email address',
      });
    }

    let user = await User.findOne({
      $or: [{ firebaseUid: decoded.uid }, { email }],
    });

    if (!user) {
      user = new User({
        username: await buildUsername(email, username || decoded.name),
        email,
        firebaseUid: decoded.uid,
        authProvider: 'firebase',
        emailVerified: Boolean(decoded.email_verified),
      });
    } else {
      user.firebaseUid = user.firebaseUid || decoded.uid;
      user.emailVerified = Boolean(decoded.email_verified);
      if (!user.password) {
        user.authProvider = 'firebase';
      }
    }

    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Firebase login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(401).json({
      success: false,
      message: 'Firebase authentication is not configured or the token could not be verified',
      errorCode: isProduction ? undefined : error.code,
      detail: isProduction ? undefined : error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
