// Attach an event listener to the login form
document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent the default form submission behavior

  // Extract username and password values from the form
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    // Send a POST request to the /login endpoint
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }), // Send credentials in JSON format
    });

    const messageElement = document.getElementById('message'); // For showing feedback messages

    if (response.ok) {
      // If login is successful, get the server's response
      const data = await response.json();
      console.log('Login successful:', data); // Debug log

      // Show success message to the user
      messageElement.textContent = data.message;
      messageElement.style.color = 'green';

      // Redirect to the dashboard after a brief delay
      setTimeout(() => {
        window.location.href = '/dashboard.html'; // Redirect to /dashboard.html
      }, 200);
    } else {
      // If login fails, show an error message
      const errorText = await response.text();
      console.error('Login failed:', errorText); // Debug log
      messageElement.textContent = errorText;
      messageElement.style.color = 'red';
    }
  } catch (error) {
    // Handle any network or unexpected errors
    console.error('Error during login:', error);
    const messageElement = document.getElementById('message');
    messageElement.textContent = 'An error occurred. Please try again later.';
    messageElement.style.color = 'red';
  }
});
