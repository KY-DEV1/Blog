const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client
app.use(express.static(path.join(__dirname, '../client')));

// MongoDB Connection dengan fallback untuk Vercel
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myblog';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log('MongoDB connection error:', err));

// Model Post
const Post = require('./models/Post');

// API Routes
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    // Fallback data jika MongoDB tidak tersedia
    const samplePosts = [
      {
        _id: '1',
        title: 'Memulai Perjalanan Web Development',
        content: 'Konten lengkap post pertama...',
        excerpt: 'Belajar dasar-dasar web development dan tools yang diperlukan untuk memulai.',
        author: 'Admin',
        tags: ['teknologi', 'pengembangan-diri'],
        featuredImage: 'https://via.placeholder.com/400x200',
        createdAt: new Date('2023-10-01')
      },
      {
        _id: '2',
        title: 'Tips Produktivitas untuk Developer',
        content: 'Konten lengkap post kedua...',
        excerpt: 'Bagaimana mengatur waktu dan meningkatkan produktivitas dalam coding.',
        author: 'Admin',
        tags: ['pengembangan-diri'],
        featuredImage: 'https://via.placeholder.com/400x200',
        createdAt: new Date('2023-10-05')
      }
    ];
    res.json(samplePosts);
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post tidak ditemukan' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
         }
