require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');  // Add this line to fix the error



// Initialize app
const app = express();
const port = process.env.PORT || 8080;

// Environment Variables
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoURI || !jwtSecret) {
  console.error('Error: MONGO_URI and JWT_SECRET must be set in .env');
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: ['https://sideprojectnode.netlify.app', 'http://localhost:3000'], // Add all frontend URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight requests
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle Preflight Requests
app.options('*', cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// MongoDB Connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized - invalid token' });
    }
    req.user = decoded;
    next();
  });
}
// Default route for '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, jwtSecret, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error);
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
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, email });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fetch Pages for Authenticated User
app.get('/get-pages', authenticateToken, async (req, res) => {
  try {
    const pages = await Page.find({ userId: req.user.id });
    if (pages.length === 0) {
      const defaultPage = new Page({
        title: 'Welcome Page',
        content: 'This is your first page. You can edit it from the dashboard.',
        userId: req.user.id,
      });
      await defaultPage.save();
      return res.status(200).json([defaultPage]);
    }
    res.status(200).json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ message: 'Error fetching pages' });
  }
});

// Save or Update a Page
app.post('/save-page/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title = 'Untitled Page', content = 'No content yet.' } = req.body;

  try {
    if (id === 'new') {
      const newPage = new Page({ title, content, userId: req.user.id });
      await newPage.save();
      return res.status(201).json({ message: 'Page created successfully', pageId: newPage._id });
    }

    const page = await Page.findByIdAndUpdate(
      id,
      { title, content },
      { new: true }
    );
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.status(200).json({ message: 'Page updated successfully', page });
  } catch (error) {
    console.error('Error saving page:', error);
    res.status(500).json({ message: 'Error saving page' });
  }
});

// Update Only Page Content
app.put('/update-content/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const page = await Page.findByIdAndUpdate(id, { content }, { new: true });
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.status(200).json({ message: 'Content updated successfully', page });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: 'Error updating content' });
  }
});

// Update Page Title
app.put('/update-title/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const page = await Page.findByIdAndUpdate(id, { title }, { new: true });
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.status(200).json({ message: 'Title updated successfully', page });
  } catch (error) {
    console.error('Error updating title:', error);
    res.status(500).json({ message: 'Error updating title' });
  }
});

// Delete a Page
app.delete('/delete-page/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid page ID' });
  }

  try {
    const page = await Page.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!page) {
      return res.status(404).json({ message: 'Page not found or unauthorized' });
    }
    res.status(200).json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Server Start
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
