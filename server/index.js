const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// In-Memory Database (SIMPLE & WORKING! 🚀)
let users = [];
let posts = [
  {
    _id: '1',
    title: 'Memulai Perjalanan Web Development',
    content: 'Halo! Ini adalah contoh post pertama di blog pribadi saya. Di sini saya akan berbagi pengalaman dan pengetahuan tentang web development...',
    excerpt: 'Belajar dasar-dasar web development dan tools yang diperlukan untuk memulai.',
    author: 'Admin',
    tags: ['teknologi', 'pengembangan-diri'],
    featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop',
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-10-01')
  },
  {
    _id: '2',
    title: 'Tips Produktivitas untuk Developer',
    content: 'Produktivitas adalah kunci kesuksesan dalam dunia programming. Berikut tips-tips yang bisa membantu...',
    excerpt: 'Bagaimana mengatur waktu dan meningkatkan produktivitas dalam coding.',
    author: 'Admin',
    tags: ['pengembangan-diri'],
    featuredImage: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop',
    createdAt: new Date('2023-10-05'),
    updatedAt: new Date('2023-10-05')
  }
];

// Simple Auth Middleware
const protect = (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized to access this route' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Find user
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ 
        message: 'User no longer exists' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Not authorized to access this route' 
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ 
      message: 'Access denied. Admin only.' 
    });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Cek jika user sudah ada
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Buat user baru
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      isAdmin: true
    };

    users.push(user);

    // Generate token
    const token = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Cek jika user exists
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Public Routes
app.get('/api/posts', (req, res) => {
  res.json({
    success: true,
    data: posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });
});

app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p._id === req.params.id);
  if (!post) {
    return res.status(404).json({ 
      success: false,
      message: 'Post tidak ditemukan' 
    });
  }
  
  res.json({
    success: true,
    data: post
  });
});

// Protected Routes - Hanya admin yang bisa CRUD
app.post('/api/posts', protect, isAdmin, (req, res) => {
  try {
    const newPost = {
      _id: Date.now().toString(),
      ...req.body,
      author: req.user.username,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    posts.push(newPost);
    
    res.status(201).json({
      success: true,
      data: newPost
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

app.put('/api/posts/:id', protect, isAdmin, (req, res) => {
  try {
    const postIndex = posts.findIndex(p => p._id === req.params.id);
    if (postIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Post tidak ditemukan' 
      });
    }

    posts[postIndex] = {
      ...posts[postIndex],
      ...req.body,
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      data: posts[postIndex]
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

app.delete('/api/posts/:id', protect, isAdmin, (req, res) => {
  try {
    const postIndex = posts.findIndex(p => p._id === req.params.id);
    if (postIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Post tidak ditemukan' 
      });
    }

    posts.splice(postIndex, 1);
    
    res.json({
      success: true,
      message: 'Post berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running with IN-MEMORY database! 🚀',
    timestamp: new Date().toISOString(),
    postsCount: posts.length,
    usersCount: users.length
  });
});

// Serve React app untuk semua route lainnya
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Export app untuk Vercel
module.exports = app;

// Untuk development lokal
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📝 IN-MEMORY Database Active!`);
    console.log(`✅ No MongoDB required!`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  });
      }
