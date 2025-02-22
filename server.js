// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); // Make sure to install this package
const { userInfo } = require('os');
// Initialize app
const app = express();
const port = process.env.PORT || 25565;
const discordWebhookUrladmin = process.env.DISCORD_WEBHOOK_URL;
const discordWebhookUrlowner = process.env.DISCORD_WEBHOOK_URL_owner;
// Validate environment variables
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!mongoURI || !jwtSecret || !emailUser || !emailPass) {
  console.error('Error: Required environment variables are missing');
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// MongoDB Connection
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

// Rate Limiting Middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts from this IP, please try again later.',
});

// Create a transport for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Replace with your email
    pass: process.env.EMAIL_PASS,   // Replace with your email password or app-specific password
  },
});

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  isAdmin: { type: Boolean, default: false }, // Admin flag
  isOwner: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null }, // Track last login time
  iswebowner: { type: Boolean, default: false },
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

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401)
              .contentType('application/json')
              .json({ message: 'Authorization token missing' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      const errorMessage = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401)
                .contentType('application/json')
                .json({ message: errorMessage });
    }

    req.user = user;
    next();
  });
}

// API Routes

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

    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin, isOwner: user.isOwner, iswebowner: user.iswebowner },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Get client IP address
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("iswebowner", user.iswebowner);
    // Notify Discord if the user is an admin
    if (user.isAdmin && !user.iswebowner) {
      const discordMessage = {
        content: `:warning: **Admin Login Alert** :warning:\n\n**Admin Username:** ${user.username}\n**Login Time:** ${new Date().toISOString()}\n**IP Address:** ${clientIp}`,
      };
      try {
        await axios.post(discordWebhookUrladmin, discordMessage);
      } catch (discordError) {
        console.error('Failed to send admin login alert to Discord:', discordError.message);
      }
    }
    if (user.iswebowner) {
      const discordMessage = {
        content: `:warning: **Web Owner Login Alert** :warning:\n\n**Web Owner Username:** ${user.username}\n**Login Time:** ${new Date().toISOString()}\n**IP Address:** ${clientIp}\n<@1249254226211901492>`,
      };
      console.log('Web Owner Login Alert:', discordMessage.content);
      try {
        await axios.post(discordWebhookUrlowner, discordMessage);
      } catch (discordError) {
        console.error('Failed to send admin login alert to Discord:', discordError.message);
      }
    }

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Register Route
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  // Ensure all required fields are present
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if username or email already exists
    if (await User.findOne({ $or: [{ username }, { email }] })) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Automatically set isAdmin if the username is "admin"
    const isAdmin = username.toLowerCase() === 'admin';

    // Hash the password and save the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      isAdmin,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', isAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Get All Users (for admin)
app.get('/get-users', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to access this route
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find({}, 'username email isAdmin isOwner iswebowner lastLogin createdAt');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Pages Route
app.get('/get-pages', authenticateToken, async (req, res) => {
  try {
    const pages = await Page.find({ userId: req.user.id });
    if (!pages.length) {
      const defaultPage = new Page({
        title: 'Welcome Page',
        content: 'This is your first page. Edit it from the dashboard.',
        userId: req.user.id,
      });
      await defaultPage.save();
      return res.status(200).json([defaultPage]);
    }

    res.status(200).json(pages);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Update Page Route
app.put('/update-page/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    // Find the page by ID and ensure the user is the owner of the page
    const page = await Page.findOne({ _id: id, userId: req.user.id });

    if (!page) {
      return res.status(404).json({ message: 'Page not found or unauthorized' });
    }

    // Update the page's title and content
    page.title = title;
    page.content = content;

    await page.save();

    res.status(200).json({ message: 'Page updated successfully', page });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Page Route
app.put('/update-role/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isAdmin, isOwner } = req.body;

  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isAdmin = isAdmin !== undefined ? isAdmin : user.isAdmin;
    user.isOwner = isOwner !== undefined ? isOwner : user.isOwner;

    await user.save();
    res.status(200).json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/admin/admindashbaord.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin/admindashbaord.html'));
});

// Delete Page Route
app.delete('/delete-page/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPage = await Page.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!deletedPage) {
      return res.status(404).json({ message: 'Page not found or unauthorized' });
    }

    res.status(200).json({ message: 'Page deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/generate-user-token', authenticateToken, async (req, res) => {
  try {
      // Ensure the request is coming from an admin
      if (!req.user.isAdmin) {
          return res.status(403).json({ message: 'Access denied' });
      }

      const { userId } = req.body;

      // Find the user by ID
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Generate a token for the selected user
      const token = jwt.sign(
          { id: user._id, username: user.username, isAdmin: user.isAdmin },
          process.env.JWT_SECRET,
          { expiresIn: '1h' } // Temporary token
      );

      res.status(200).json({ token });
  } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
  }
});
// Delete User Route
app.delete('/delete-user/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Only admins can delete users
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully', user: deletedUser });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.put('/update-role/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isAdmin, isOwner } = req.body; // Accept `isAdmin` and `isOwner` in the request body

  try {
    // Check if the request is from an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the user by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the roles if values are provided
    if (typeof isAdmin !== 'undefined') user.isAdmin = isAdmin;
    if (typeof isOwner !== 'undefined') user.isOwner = isOwner;

    // Save the changes to the database
    await user.save();

    res.status(200).json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add New Page Route
app.post('/add-page', authenticateToken, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    const newPage = new Page({
      title,
      content,
      userId: req.user.id,
    });

    await newPage.save();
    res.status(201).json({ message: 'Page added successfully', page: newPage });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});
app.post('/shutdown', (req, res) => {
  const authToken = req.headers['authorization'];
  if (authToken !== 'Bearer <your-secret-token>') {
      return res.status(403).send('Forbidden');
  }
  console.log('Shutdown initiated by admin.');
  res.send('Server shutting down.');
  process.exit(0); // Stops the Node.js process
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});