require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Initialize app
const app = express();
const port = process.env.PORT || 8080;

// Environment Variables
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!mongoURI || !jwtSecret || !emailUser || !emailPass) {
  console.error('Error: MONGO_URI, JWT_SECRET, EMAIL_USER, and EMAIL_PASS must be set in .env');
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts from this IP, please try again later.',
});

// MongoDB Connection
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
const User = mongoose.model('User', userSchema);

// Page Schema and Model
const pageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});
const Page = mongoose.model('Page', pageSchema);

// Token Authentication Middleware
// Token Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Received Authorization Header:', authHeader); // Add logging

  if (!token) {
    return res.status(401)
              .contentType('application/json')
              .json({ message: 'Authorization token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err); // Add error logging
      const errorMessage = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401)
                .contentType('application/json')
                .json({ message: errorMessage });
    }

    req.user = user;
    next();
  });
}

// Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve index.html for root route
  app.get(['/', '/dashboard', '*'], (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

// Login Route
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, jwtSecret, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Registration Route
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    if (await User.findOne({ $or: [{ username }, { email }] })) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, email });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fetch Pages
// Modify the get-pages route to add more robust error handling
// Modify the static file serving logic
if (process.env.NODE_ENV === 'production') {
  // Ensure API routes are handled before static file serving
  app.use((req, res, next) => {
    // List of your API routes
    const apiRoutes = ['/login', '/register', '/get-pages'];
    
    if (apiRoutes.some(route => req.path.startsWith(route))) {
      return next(); // Continue to the route handler
    }
    
    // Serve static files for non-API routes
    if (req.accepts('html')) {
      res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
    } else {
      next();
    }
  });
}

// Ensure get-pages route is before static file serving
app.get('/get-pages', authenticateToken, async (req, res) => {
  try {
    const pages = await Page.find({ userId: req.user.id });
    console.log("user id", req.user.id);
    
    // Explicitly set JSON content type
    res.type('application/json');
    
    if (!pages.length) {
      const defaultPage = new Page({
        title: 'Welcome Page',
        content: 'This is your first page. Edit it from the dashboard.',
        userId: req.user.id,
      });
      await defaultPage.save();
      return res.json([defaultPage]);
    }
    
    res.json(pages);
  } catch (error) {
    console.error('Error in get-pages route:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
});

// Enhance the authenticateToken middleware for better debugging


// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Start Server
app.listen(port, () => console.log(`Server running on port ${port}`));
