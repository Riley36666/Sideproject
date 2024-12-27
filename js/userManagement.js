class UserManagement {
    static renderUserList(users, listId) {
        const userList = document.getElementById(listId);
        userList.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <select onchange="UserManagement.handleRoleUpdate('${user._id}', this.value)">
                        <option value="none" ${!user.isAdmin && !user.iswebowner ? 'selected' : ''}>None</option>
                        <option value="admin" ${user.isAdmin && !user.iswebowner ? 'selected' : ''}>Admin</option>
                        <option value="owner" ${user.iswebowner ? 'selected' : ''}>Owner</option>
                    </select>
                </td>
                <td>${formatDate(user.lastLogin)}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <button class="btn" onclick="UserManagement.handleLoginAsUser('${user._id}')">
                        Login as User
                    </button>
                    <button class="btn btn-danger" onclick="UserManagement.handleDeleteUser('${user._id}')">
                        Delete
                    </button>
                </td>
            `;
            userList.appendChild(row);
        });
    }

    static async handleRoleUpdate(userId, role) {
        try {
            await API.updateUserRole(userId, role);
            alert('User role updated successfully');
            await this.refreshUsers();
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update user role.');
        }
    }

    static async handleDeleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await API.deleteUser(userId);
            alert('User deleted successfully');
            await this.refreshUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user.');
        }
    }

    static async handleLoginAsUser(userId) {
        try {
            const { token } = await API.loginAsUser(userId);
            localStorage.setItem('token', token);
            window.location.href = '/dashboard.html';
        } catch (error) {
            console.error('Error logging in as user:', error);
            alert('Failed to log in as user.');
        }
    }

    static async refreshUsers() {
        try {
            const users = await API.fetchUsers();
            const owners = users.filter(user => user.isWebOwner);
            const admins = users.filter(user => user.isAdmin && !user.iswebowner);
            const regularUsers = users.filter(user => !user.isAdmin && !user.iswebowner);

            this.renderUserList(admins, 'admin-list');
            this.renderUserList(owners, 'owner-list');
            this.renderUserList(regularUsers, 'user-list');
        } catch (error) {
            console.error('Error refreshing users:', error);
            alert('Failed to refresh users. Please try again later.');
        }
    }
}