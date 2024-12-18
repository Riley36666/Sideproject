document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const messageElement = document.getElementById('login-message');

  try {
    const response = await fetch('https://website2-production-e553.up.railway.app/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    // Log full response details for debugging
    console.log('Login Response Status:', response.status);
    console.log('Login Response Headers:', Object.fromEntries(response.headers.entries()));

    // Always try to parse as JSON, with error catching
    let data = {};
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      
      // If JSON parsing fails, try to get text to see what was returned
      const text = await response.text();
      console.error('Response text:', text);
      
      throw new Error('Invalid server response');
    }

    if (response.ok) {
      // Ensure token is saved
      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token saved successfully');
      } else {
        throw new Error('No token received');
      }

      messageElement.textContent = 'Login successful!';
      messageElement.style.color = 'green';
      
      // Redirect with a slight delay
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 200);
    } else {
      // Handle login failure
      messageElement.textContent = data.message || 'Login failed';
      messageElement.style.color = 'red';
    }
  } catch (error) {
    console.error('Login error:', error);
    messageElement.textContent = 'Network error. Please try again.';
    messageElement.style.color = 'red';
  }
});