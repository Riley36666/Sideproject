document.addEventListener('DOMContentLoaded', () => {
  const apiUrl = window.location.origin;
  const contentModal = document.getElementById('contentModal');
  const titleInput = document.getElementById('title-input');
  const contentDisplay = document.getElementById('content-display');
  const saveContentBtn = document.getElementById('save-content-btn');
  const closeContentBtn = document.getElementById('close-content-btn');
  let currentPageId = null;

  // Helper: Decode JWT Token
  function decodeToken(token) {
    try {
      const base64Payload = token.split('.')[1];
      const payload = atob(base64Payload);
      return JSON.parse(payload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Display User Info and Handle Admin Button
  function displayUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/index.html';
      return;
    }

    const userInfo = decodeToken(token);
    if (userInfo) {
      const userInfoElement = document.getElementById('user-info');
      const adminBtn = document.getElementById('admin-btn');
      if (userInfoElement) {
        const role = userInfo.isOwner ? 'Owner' : (userInfo.isAdmin ? 'Admin' : 'User');
        userInfoElement.textContent = `Logged in as: ${userInfo.username} (${role})`;
      }

      if (userInfo.isAdmin && adminBtn) {
        adminBtn.style.display = 'block';
        adminBtn.addEventListener('click', () => {
          window.location.href = `${window.location.origin}/admin/admindashbaord.html`;
        });
      }
    } else {
      localStorage.removeItem('token');
      window.location.href = '/index.html';
    }
  }

  // Fetch and Render Pages
  async function fetchPages() {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${apiUrl}/get-pages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const pages = await response.json();
      renderPageList(pages);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  }

  // Render Page List
  function renderPageList(pages) {
    const pageListDiv = document.getElementById('page-list');
    if (!pageListDiv) return;
    pageListDiv.innerHTML = '';

    pages.forEach(page => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page-card';
      pageDiv.innerHTML = `
        <div>${page.title}</div>
        <div>
          <button class="view">View</button>
          <button class="edit" style="display: none;">Edit</button>
          <button class="delete">Delete</button>
        </div>
      `;
      pageListDiv.appendChild(pageDiv);

      // Add Event Listeners
      pageDiv.querySelector('.view')?.addEventListener('click', () => {
        openContentModal(page.title, page.content);
      });

      pageDiv.querySelector('.edit')?.addEventListener('click', () => {
        currentPageId = page._id;
        openContentModal(page.title, page.content);
      });

      pageDiv.querySelector('.delete')?.addEventListener('click', () => {
        deletePage(page._id);
      });
    });
  }

  // Open Content Modal
  function openContentModal(title, content) {
    titleInput.value = title;
    contentDisplay.value = content;
    contentModal.style.display = 'flex';
  }

  // Close Content Modal
  closeContentBtn.addEventListener('click', () => {
    contentModal.style.display = 'none';
  });

  // Save Content
  saveContentBtn.addEventListener('click', async () => {
    const updatedTitle = titleInput.value;
    const updatedContent = contentDisplay.value;
    
    if (!currentPageId) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${apiUrl}/update-page/${currentPageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: updatedTitle, content: updatedContent }),
      });

      if (response.ok) {
        fetchPages();
        contentModal.style.display = 'none';
      } else {
        console.error('Error updating page:', await response.json());
      }
    } catch (error) {
      console.error('Error updating page:', error);
    }
  });

  // Add New Page
  document.getElementById('add-page-btn')?.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const title = prompt('Enter a title for the new page:');
    const content = prompt('Enter initial content for the new page:');

    if (!title || !content) return;

    try {
      const response = await fetch(`${apiUrl}/add-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        fetchPages();
      } else {
        console.error('Error adding page:', await response.json());
      }
    } catch (error) {
      console.error('Error adding new page:', error);
    }
  });

  // Delete Page
  async function deletePage(pageId) {
    if (!confirm('Are you sure you want to delete this page?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${apiUrl}/delete-page/${pageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  }

  // Settings Modal Logic
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  if (settingsBtn && settingsModal && closeSettingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });

    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });

    darkModeToggle?.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    });
  }

  // Logout Functionality
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
  });

  // Initialize Dashboard
  displayUserInfo();
  fetchPages();
});