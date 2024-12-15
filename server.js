require('dotenv').config(); // Add this line at the top of the file

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080; // Use the PORT environment variable or default to 8080

// Use environment variables
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

// Middleware setup
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));

// MongoDB connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));
// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Find the user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate a JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      jwtSecret,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Registration route
// Registration route
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  // Check if all fields are provided
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if the username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// User schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

// Page schema and model
const pageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Associate page with a user
  createdAt: { type: Date, default: Date.now },
});
const Page = mongoose.model('Page', pageSchema);


// Token middleware for authorization
function authenticateToken(req, res, next) {
  const tokenHeader = req.headers['authorization'];
  if (!tokenHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const tokenParts = tokenHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid token format' });
  }

  const tokenValue = tokenParts[1];
  jwt.verify(tokenValue, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized - invalid token' });
    }

    req.user = decoded;
    next();
  });
}

// Fetch all pages or add a default page if no pages exist
app.get('/get-pages', authenticateToken, async (req, res) => {
  console.log('Received request to fetch pages');

  try {
    // Fetch pages associated with the logged-in user
    const pages = await Page.find({ userId: req.user.id }); // Filter pages by userId

    // Ensure pages is an array, even if it's empty
    if (!Array.isArray(pages)) {
      return res.status(500).json({ message: 'Unexpected server response' });
    }

    // If there are no pages, create a default one
    if (pages.length === 0) {
      const defaultPage = new Page({
        title: 'Welcome Page',
        content: 'This is your first page. You can edit it from the dashboard.',
        userId: req.user.id, // Associate with the logged-in user
      });
      await defaultPage.save();
      console.log('Default page created:', defaultPage);

      // Return the newly created default page
      return res.status(200).json([defaultPage]);  // Ensure it's an array
    }

    console.log('Pages fetched:', pages);
    res.status(200).json(pages);  // Ensure pages are returned as an array
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ message: 'Error fetching pages' });
  }
});


// Save or update a page
// Route to save or update a page
app.post('/save-page/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  // Default values for title and content if not provided
  const pageTitle = title || 'Untitled Page';  // Default title
  const pageContent = content || 'This page has no content yet. You can edit it from the dashboard.';  // Default content

  try {
    if (id === 'new') {
      // Create a new page if the ID is 'new'
      const newPage = new Page({
        title: pageTitle,
        content: pageContent,
        userId: req.user.id, // Associate with the logged-in user
      });
      await newPage.save();
      return res.status(201).json({ message: 'New page created successfully', pageId: newPage._id });
    }

    // Update the existing page by its ID
    const page = await Page.findByIdAndUpdate(
      id,
      { title: pageTitle, content: pageContent },
      { new: true } // Return the updated page
    );

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.status(200).json({ message: 'Page updated successfully', page });
  } catch (error) {
    console.error('Error saving/updating page:', error);
    res.status(500).json({ message: 'Error saving/updating page' });
  }
});


// Route to update only the page content
app.put('/update-text/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    // Update only the content of the page
    const page = await Page.findByIdAndUpdate(
      id,
      { content },
      { new: true } // Return the updated page
    );

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.status(200).json({ message: 'Content updated', page });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: 'Error saving content' });
  }
});

// Update the content of a page
app.put('/update-content/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const page = await Page.findByIdAndUpdate(
      id,
      { content },
      { new: true } // Return the updated page
    );

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.status(200).json({ message: 'Content updated', page });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: 'Error updating content' });
  }
});

// PUT to update the title of a page
app.put('/update-title/:id', async (req, res) => {
  const { title } = req.body;
  const pageId = req.params.id;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: 'Page not found' });

    page.title = title;
    await page.save();
    res.status(200).json({ message: 'Title updated successfully' });
  } catch (error) {
    console.error('Error updating title:', error);
    res.status(500).json({ message: 'Error updating title' });
  }
});

// DELETE a page
app.delete('/delete-page/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log('Received ID for deletion:', id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log('Invalid ID format');
    return res.status(400).json({ message: 'Invalid page ID' });
  }

  try {
    // Check if the page belongs to the logged-in user
    const page = await Page.findOneAndDelete({ _id: id, userId: req.user.id }); // Ensure user can only delete their own pages

    if (!page) {
      console.log('No page found or unauthorized');
      return res.status(404).json({ message: 'Page not found or unauthorized' });
    }

    console.log('Deleted page:', page);
    res.status(200).json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error during deletion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Create a new page if none exist
app.post('/save-page/new', authenticateToken, async (req, res) => {
  try {
    const newPage = new Page({ title: 'New Page', content: '' });
    await newPage.save();
    res.status(201).json({
      message: 'Page created successfully',
      pageId: newPage._id,
    });
  } catch (error) {
    console.error('Error during save-page/new:', error);
    res.status(500).json({ message: 'Error creating new page' });
  }
});

// Server start
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
