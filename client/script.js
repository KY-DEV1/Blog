// API Base URL - Otomatis detect environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : '/api';

// DOM Elements
let posts = [];
let currentFilter = 'all';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadPosts();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      filterPosts();
    });
  });

  // Contact form
  document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Pesan berhasil dikirim! (Simulasi)');
    this.reset();
  });

  // Post form
  document.getElementById('postForm').addEventListener('submit', handlePostSubmit);

  // Hamburger menu untuk mobile
  document.querySelector('.hamburger').addEventListener('click', function() {
    document.querySelector('.nav-menu').classList.toggle('active');
  });
}

// Load posts from API
async function loadPosts() {
  try {
    showLoading();
    const response = await fetch(`${API_URL}/posts`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    posts = await response.json();
    displayPosts(posts);
    hideLoading();
  } catch (error) {
    console.error('Error loading posts:', error);
    // Fallback data jika API tidak tersedia
    posts = getSamplePosts();
    displayPosts(posts);
    hideLoading();
  }
}

// Display posts in grid
function displayPosts(postsToDisplay) {
  const container = document.getElementById('posts-container');
  
  if (postsToDisplay.length === 0) {
    container.innerHTML = '<p class="no-posts">Belum ada postingan.</p>';
    return;
  }

  container.innerHTML = postsToDisplay.map(post => `
    <div class="post-card" data-tags="${post.tags ? post.tags.join(',') : ''}">
      ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" class="post-image">` : 
        '<div class="post-image placeholder">No Image</div>'}
      <div class="post-content">
        <h3>${post.title}</h3>
        <p class="post-excerpt">${post.excerpt}</p>
        <div class="post-meta">
          <span>Oleh ${post.author || 'Admin'}</span>
          <span>${formatDate(post.createdAt)}</span>
        </div>
        <div class="post-tags">
          ${post.tags ? post.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
        </div>
        <div class="post-actions">
          <button class="btn btn-edit" onclick="editPost('${post._id || post.id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-delete" onclick="deletePost('${post._id || post.id}')">
            <i class="fas fa-trash"></i> Hapus
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ... (fungsi lainnya tetap sama seperti sebelumnya)

// Loading states
function showLoading() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '<div class="loading">Memuat posts...</div>';
}

function hideLoading() {
  // Loading akan diganti oleh displayPosts
}

// Sample data for fallback
function getSamplePosts() {
  return [
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
}
