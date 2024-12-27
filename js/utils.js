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

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleString() : 'Never';
}

function getAuthToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return null;
    }
    return token;
}