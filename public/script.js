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
      console.log("fetched pages:", pages);
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
          <button class="view" style="background: var(--button-background); color: var(--button-text-color); border-radius: 8px; padding: 8px 12px; border: none; cursor: pointer;">View</button>
          <button class="edit" style="display: none; background: var(--edit-button-background); color: #fff; border-radius: 8px; padding: 8px 12px; border: none; cursor: pointer;">Edit</button>
          <button class="delete" style="background: var(--close-button-background); color: #fff; border-radius: 8px; padding: 8px 12px; border: none; cursor: pointer;">Delete</button>
        </div>
      `;
      pageListDiv.appendChild(pageDiv);

      // Add Event Listeners
      pageDiv.querySelector('.view')?.addEventListener('click', () => {
        currentPageId = page._id;
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

  // Rewrite Content with AI

  // Save Content
  saveContentBtn.addEventListener('click', async () => {
    const updatedTitle = titleInput.value;
    const updatedContent = contentDisplay.value;
    
    if (!currentPageId) {
      console.error('No current page ID set. Cannot save content.');
      return;
    }

    console.log('Saving content:', { updatedTitle, updatedContent, currentPageId });

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

  // Command Handling
  const commandInput = document.getElementById('command-input');
  commandInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleCommand(commandInput.value);
      commandInput.value = '';
    }
  });

  // Command Examples
  const commandExamples = {
    new: "Create a new page. Usage: new <page_title>",
    delete: "Delete a page by title. Usage: delete <page_title>",
    list: "List all pages. Usage: list",
    view: "View a specific page by title. Usage: view <page_title>",
    edit: "Edit a specific page by title. Usage: edit <page_title>",
  };

  // Autocomplete Suggestions
  const commandList = Object.keys(commandExamples);
  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
  commandInput.parentNode.appendChild(suggestionBox);
  
  commandInput.addEventListener('input', () => {
    const input = commandInput.value.toLowerCase();
    suggestionBox.innerHTML = '';
    if (input) {
      const suggestions = commandList.filter(command => command.startsWith(input));
      suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.addEventListener('click', () => {
          commandInput.value = suggestion;
          suggestionBox.innerHTML = '';
        });
        suggestionBox.appendChild(suggestionItem);
      });
    }
  });

  commandInput.addEventListener('focus', () => {
    suggestionBox.innerHTML = '';
    Object.entries(commandExamples).forEach(([command, example]) => {
      const exampleItem = document.createElement('div');
      exampleItem.textContent = `${command}: ${example}`;
      suggestionBox.appendChild(exampleItem);
    });
  });

  commandInput.addEventListener('blur', () => {
    suggestionBox.innerHTML = '';
  });
  
  async function handleCommand(command) {
    const [action, ...args] = command.split(' ');
    switch (action.toLowerCase()) {
      case 'new':
        addNewPage(args.join(' '), true);
        break;
      case 'delete':
        deletePageByTitle(args.join(' '), true);
        break;
      case 'list':
        await listPages();
        break;
      case 'view':
        const titleToView = args.join(' ');
        await viewPage(titleToView);
        break;
      case 'edit':
        const titleToEdit = args.join(' ');
        await editPage(titleToEdit);
        break;
      default:
        alert('Unknown command');
    }
  }

  async function listPages() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiUrl}/get-pages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const pages = await response.json();
    renderPageList(pages);
  }

  async function viewPage(title) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiUrl}/get-pages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const pages = await response.json();
    const pageToView = pages.find(page => page.title.toLowerCase() === title.toLowerCase());
    if (pageToView) {
      openContentModal(pageToView.title, pageToView.content);
    } else {
      alert('Page not found');
    }
  }

  async function editPage(title) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiUrl}/get-pages`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const pages = await response.json();
    const pageToEdit = pages.find(page => page.title.toLowerCase() === title.toLowerCase());
    if (pageToEdit) {
      currentPageId = pageToEdit._id;
      openContentModal(pageToEdit.title, pageToEdit.content);
    } else {
      alert('Page not found');
    }
  }

  displayUserInfo();
  fetchPages();
});