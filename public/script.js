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

  // Open Content Modal
  function openContentModal(title, content, pageId) {
    titleInput.value = title;
    contentDisplay.value = content;
    currentPageId = pageId;
    contentModal.style.display = 'flex';
  }

  // Save Content when Title Loses Focus (blur)
  titleInput.addEventListener('blur', async () => {
    const updatedTitle = titleInput.value;
    const updatedContent = contentDisplay.value;

    if (!currentPageId) {
      console.error('No current page ID set. Cannot save content.');
      return;
    }

    await savePageContent(updatedTitle, updatedContent);
  });

  // Save Content to Backend
  async function savePageContent(updatedTitle, updatedContent) {
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
        console.log('Page content saved');
      } else {
        console.error('Error saving content:', await response.json());
      }
    } catch (error) {
      console.error('Error saving page content:', error);
    }
  }

  // Save Button (optional)
  saveContentBtn.addEventListener('click', async () => {
    const updatedTitle = titleInput.value;
    const updatedContent = contentDisplay.value;

    if (!currentPageId) {
      console.error('No current page ID set. Cannot save content.');
      return;
    }

    await savePageContent(updatedTitle, updatedContent);
    contentModal.style.display = 'none'; // Close modal after saving
  });

  // Close Content Modal
  closeContentBtn.addEventListener('click', () => {
    contentModal.style.display = 'none';
  });

  // Fetch Pages (Initial)
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
        </div>
      `;
      pageListDiv.appendChild(pageDiv);

      // Add Event Listeners
      pageDiv.querySelector('.view')?.addEventListener('click', () => {
        openContentModal(page.title, page.content, page._id);
      });
    });
  }

  // Initial Fetch of Pages
  fetchPages();
});
