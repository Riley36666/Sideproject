class API {
    static async fetchUsers() {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.getUsers}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`Error: ${response.statusText}`);
        }

        return response.json();
    }

    static async updateUserRole(userId, role) {
        const token = getAuthToken();
        if (!token) return;

        const isAdmin = role === 'admin';
        const isOwner = role === 'owner';

        const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.updateRole}/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isAdmin, isOwner })
        });

        if (!response.ok) throw new Error('Failed to update role');
        return response.json();
    }

    static async deleteUser(userId) {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.deleteUser}/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    }

    static async loginAsUser(userId) {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.generateUserToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) throw new Error('Failed to generate user token');
        return response.json();
    }
}