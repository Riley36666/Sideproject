// JavaScript to handle sidebar button clicks

// Handle Home Button click
document.getElementById('home-btn').addEventListener('click', function() {
    document.getElementById('page-title').innerHTML = 'Welcome to the Dashboard';
    document.getElementById('default-message').style.display = 'block';
    hideSections();
  });
  
  // Handle Pages Button click
  document.getElementById('pages-btn').addEventListener('click', function() {
    document.getElementById('page-title').innerHTML = "Pages";
    showPageList();
  });
  
  // Handle Settings Button click
  document.getElementById('settings-btn').addEventListener('click', function() {
    document.getElementById('page-title').innerHTML = "Settings";
    showSettings();
  });
  
  // Handle Logout Button click
  document.getElementById('logout-btn').addEventListener('click', function() {
    alert('Logging out...');
    window.location.href = '/';
  });
  
  // Show Pages List Section
  async function showPageList() {
    document.getElementById('default-message').style.display = 'none';
    hideSections();
    const pageListSection = document.getElementById('page-list-section');
    pageListSection.style.display = 'block';
    loadPages();
  }
  
  // Show Settings Section
  function showSettings() {
    document.getElementById('default-message').style.display = 'none';
    hideSections();
    document.getElementById('settings-section').style.display = 'block';
  }
  
  // Hide all sections
  function hideSections() {
    document.getElementById('page-list-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'none';
  }
  
  // Function to load pages from the server
  async function loadPages() {
    const pageList = document.getElementById('page-list');
    pageList.innerHTML = '';  // Clear the page list
  
    const response = await fetch('/get-pages');
    const pages = await response.json();
  
    pages.forEach(page => {
      const pageCard = document.createElement('div');
      pageCard.className = 'page-card';
      pageCard.setAttribute('data-id', page.id);
      pageCard.innerHTML = `
        <div class="title">${page.title}</div>
        <p>${page.content}</p>
        <button onclick="editPage(${page.id})">Edit</button>
        <button onclick="deletePage(${page.id})">Delete</button>
      `;
      pageList.appendChild(pageCard);
    });
  }
  
  // Function to add a new page
  async function addPage() {
    const title = 'New Page';
    const content = 'This is a new page.';
  
    const response = await fetch('/save-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
  
    if (response.ok) {
      loadPages();  // Reload pages after saving
    } else {
      console.error('Failed to save page');
    }
  }
  
  // Function to delete a page
  async function deletePage(pageId) {
    const response = await fetch(`/delete-page/${pageId}`, {
      method: 'DELETE',
    });
  
    if (response.ok) {
      loadPages();  // Reload pages after deleting
    } else {
      console.error('Failed to delete page');
    }
  }
  
  // Function to edit a page
  function editPage(pageId) {
    const pageCard = document.querySelector(`.page-card[data-id="${pageId}"]`);
    const title = pageCard.querySelector('.title').textContent;
    const content = pageCard.querySelector('p').textContent;
  
    // Create input fields to edit the page title and content
    const titleInput = document.createElement('input');
    titleInput.value = title;
    const contentInput = document.createElement('textarea');
    contentInput.value = content;
  
    // Clear the current content of the page card and append the input fields
    pageCard.innerHTML = '';
    pageCard.appendChild(titleInput);
    pageCard.appendChild(contentInput);
  
    // Create and append the save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = function() {
      savePageChanges(pageId, titleInput.value, contentInput.value);
    };
    pageCard.appendChild(saveBtn);
  }
  
  // Function to save the changes of a page
  async function savePageChanges(pageId, title, content) {
    const response = await fetch(`/save-page/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
  
    if (response.ok) {
      loadPages();  // Reload pages after saving changes
    } else {
      console.error('Failed to save page');
    }
  }
  
  // Handle Settings Form Submit
  document.getElementById('settings-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    
    fetch('/save-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    })
    .then(response => response.json())
    .then(data => {
      alert('Settings updated!');
    })
    .catch(error => {
      console.error('Error saving settings:', error);
    });
  });
  