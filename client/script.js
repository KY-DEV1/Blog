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

  // Formspree form handling
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = this;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.textContent = 'Mengirim...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('Pesan berhasil dikirim! 🎉');
            form.reset();
        } else {
            throw new Error('Gagal mengirim pesan');
        }
    } catch (error) {
        alert('Maaf, terjadi error. Silakan coba lagi atau hubungi via email langsung.');
        console.error('Formspree error:', error);
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

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

// Filter posts by category
function filterPosts() {
    if (currentFilter === 'all') {
        displayPosts(posts);
    } else {
        const filteredPosts = posts.filter(post => 
            post.tags && post.tags.includes(currentFilter)
        );
        displayPosts(filteredPosts);
    }
}

// Show post form modal
function showPostForm(postId = null) {
    const modal = document.getElementById('postModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('postForm');
    
    if (postId) {
        title.textContent = 'Edit Post';
        const post = posts.find(p => (p._id || p.id) === postId);
        if (post) {
            document.getElementById('postId').value = postId;
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postExcerpt').value = post.excerpt;
            document.getElementById('postTags').value = post.tags ? post.tags.join(', ') : '';
            document.getElementById('postImage').value = post.featuredImage || '';
        }
    } else {
        title.textContent = 'Tambah Post Baru';
        form.reset();
        document.getElementById('postId').value = '';
    }
    
    modal.style.display = 'block';
}

// Close post form modal
function closePostForm() {
    document.getElementById('postModal').style.display = 'none';
}

// Handle post form submission
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('postTitle').value,
        content: document.getElementById('postContent').value,
        excerpt: document.getElementById('postExcerpt').value,
        tags: document.getElementById('postTags').value.split(',').map(tag => tag.trim()),
        featuredImage: document.getElementById('postImage').value || undefined
    };

    const postId = document.getElementById('postId').value;
    
    try {
        let response;
        if (postId) {
            // Update existing post
            response = await fetch(`${API_URL}/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new post
            response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        }

        if (response.ok) {
            closePostForm();
            loadPosts(); // Reload posts
        } else {
            alert('Error menyimpan post');
        }
    } catch (error) {
        console.error('Error saving post:', error);
        alert('Error menyimpan post');
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Apakah Anda yakin ingin menghapus post ini?')) return;
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadPosts(); // Reload posts
        } else {
            alert('Error menghapus post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error menghapus post');
    }
}

// Edit post
function editPost(postId) {
    showPostForm(postId);
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

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

