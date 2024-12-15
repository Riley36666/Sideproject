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
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const errorMessage = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ message: errorMessage });
    }

    req.user = user;
    next();
  });
}

// Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'index.html')));
  app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'dashboard.html')));
  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'index.html')));
} else {
  app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'index.html')));
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
app.get('/get-pages', authenticateToken, async (req, res) => {
  try {
    const pages = await Page.find({ userId: req.user.id });
    if (pages.length === 0) {
      const defaultPage = new Page({ title: 'Welcome Page', content: 'Edit this page.', userId: req.user.id });
      await defaultPage.save();
      return res.status(200).json([defaultPage]);
    }
    res.status(200).json(pages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pages' });
  }
});

// Start Server
app.listen(port, () => console.log(`Server running on port ${port}`));
