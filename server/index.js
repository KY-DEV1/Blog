const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myblog';

console.log('🔄 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB successfully!'))
.catch(err => {
  console.log('❌ MongoDB connection failed:', err.message);
  console.log('💡 Using fallback data mode');
});

// Post Schema
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'Admin'
  },
  tags: [String],
  featuredImage: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Post = mongoose.model('Post', postSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
});

// Hash password sebelum save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method untuk compare password
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Auth Middleware
const protect = async (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
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

// Sample data untuk fallback
const getSamplePosts = () => [
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
  },
  {
    _id: '3',
    title: 'Exploring Bali: Hidden Gems',
    content: 'Bali tidak hanya tentang Kuta dan Seminyak. Masih banyak tempat tersembunyi yang menakjubkan...',
    excerpt: 'Tempat-tempat tersembunyi di Bali yang wajib dikunjungi.',
    author: 'Admin',
    tags: ['travel'],
    featuredImage: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=200&fit=crop',
    createdAt: new Date('2023-10-10'),
    updatedAt: new Date('2023-10-10')
  }
];

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Cek jika user sudah ada
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Buat user admin pertama
    const user = await User.create({
      username,
      password,
      isAdmin: true // User pertama jadi admin
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
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

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Cek jika user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
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

// Public Routes - Bisa diakses semua orang
app.get('/api/posts', async (req, res) => {
  try {
    let posts;
    
    // Coba ambil dari MongoDB
    if (mongoose.connection.readyState === 1) {
      posts = await Post.find().sort({ createdAt: -1 });
    } else {
      // Fallback ke sample data
      posts = getSamplePosts();
    }
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    // Fallback ke sample data jika error
    res.json({
      success: true,
      data: getSamplePosts()
    });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    let post;
    
    if (mongoose.connection.readyState === 1) {
      post = await Post.findById(req.params.id);
    } else {
      // Fallback ke sample data
      post = getSamplePosts().find(p => p._id === req.params.id);
    }
    
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
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Protected Routes - Hanya admin yang bisa CRUD
app.post('/api/posts', protect, isAdmin, async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      author: req.user.username,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await post.save();
    
    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

app.put('/api/posts/:id', protect, isAdmin, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id, 
      { 
        ...req.body, 
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );
    
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
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

app.delete('/api/posts/:id', protect, isAdmin, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post tidak ditemukan' 
      });
    }
    
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
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve React app untuk semua route lainnya
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Export app untuk Vercel
module.exports = app;

// Untuk development lokal
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📝 API tersedia di http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend tersedia di http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  });
}
