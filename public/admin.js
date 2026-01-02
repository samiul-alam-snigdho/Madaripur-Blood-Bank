document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginError = document.getElementById('loginError');
    const adminDonorList = document.getElementById('adminDonorList');

    // Check Auth Status on Load
    checkAuth();

    // Login Handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                checkAuth(); // Reload state
            } else {
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    });

    // Logout Handler
    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload();
    });

    // Functions
    async function checkAuth() {
        try {
            const res = await fetch('/api/check-auth');
            const data = await res.json();

            if (data.authenticated) {
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                loadDonors();
            } else {
                loginSection.style.display = 'flex';
                dashboardSection.style.display = 'none';
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadDonors() {
        try {
            const res = await fetch('/api/blood-donors');
            const donors = await res.json();

            if (Array.isArray(donors)) {
                adminDonorList.innerHTML = donors.map(d => `
                    <tr>
                        <td>${d.id}</td>
                        <td>${d.name}</td>
                        <td><span class="blood-group-badge" style="position:static; display:inline-block; font-size: 0.8rem; background-color: #e53935; color: white; padding: 0.2rem 0.5rem; border-radius: 20px;">${d.blood_group}</span></td>
                        <td>${d.phone}</td>
                        <td>${d.location}</td>
                        <td>${d.age || 'N/A'}</td>
                        <td>
                            <button class="action-btn" onclick="deleteDonor(${d.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error(err);
        }
    }

    window.deleteDonor = async (id) => {
        if (!confirm('Are you sure you want to delete this donor?')) return;

        try {
            const res = await fetch(`/api/blood-donors/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadDonors();
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Failed to delete'));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete donor');
        }
    };
});
