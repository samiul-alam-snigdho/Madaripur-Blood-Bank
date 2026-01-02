const API_URL = '/api/blood-donors';

document.addEventListener('DOMContentLoaded', () => {
    fetchDonors();
});

async function fetchDonors() {
    const bloodGroup = document.getElementById('bloodGroupFilter').value;
    const location = document.getElementById('locationFilter').value;

    let url = API_URL;
    const params = new URLSearchParams();
    if (bloodGroup) params.append('blood_group', bloodGroup);
    if (location) params.append('location', location);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    try {
        const response = await fetch(url);
        const donors = await response.json();
        renderDonors(donors);
    } catch (error) {
        console.error('Error fetching donors:', error);
        document.getElementById('donorsGrid').innerHTML = '<p>Error loading donors. Please try again later.</p>';
    }
}

let allDonors = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

function renderStats(donors) {
    const container = document.getElementById('statsContainer');
    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    // Calculate counts
    const counts = {};
    donors.forEach(d => {
        counts[d.blood_group] = (counts[d.blood_group] || 0) + 1;
    });

    let html = `
        <div class="stat-card">
            <div class="stat-icon"><i class="ph-fill ph-users"></i></div>
            <div class="stat-info">
                <h4 class="counter" data-target="${donors.length}">0</h4>
                <p>Total Donors</p>
            </div>
        </div>
    `;

    bloodGroups.forEach(bg => {
        if (counts[bg]) {
            html += `
                <div class="stat-card">
                    <div class="stat-icon" style="font-size: 1rem;">${bg}</div>
                    <div class="stat-info">
                        <h4 class="counter" data-target="${counts[bg]}">0</h4>
                        <p>Donors</p>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;

    // Trigger animation
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const duration = 4000; // 4 seconds (slower)
        const increment = target / (duration / 16); // 60fps

        let current = 0;
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = target;
            }
        };
        updateCounter();
    });
}

function renderDonors(donors) {
    allDonors = donors; // Store for pagination
    currentPage = 1;
    renderStats(donors);
    renderPage(1);
}

function renderPage(page) {
    currentPage = page;
    const grid = document.getElementById('donorsGrid');
    grid.innerHTML = '';

    if (allDonors.length === 0) {
        grid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">No donors found matching your criteria.</p>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = allDonors.slice(start, end);

    pageItems.forEach(donor => {
        const card = document.createElement('div');
        card.className = 'donor-card';

        const lastDonationText = donor.last_donation_date
            ? `Last Donation: ${donor.last_donation_date}`
            : 'No previous donation record';

        card.innerHTML = `
            <div class="blood-group-badge">${donor.blood_group}</div>
            <div class="donor-avatar">
                <i class="ph-fill ph-user"></i>
            </div>
            <h3 class="donor-name">${donor.name}</h3>
            <div class="donor-location">
                <i class="ph-fill ph-map-pin"></i>
                ${donor.location}
            </div>
            <div class="last-donation">
                ${lastDonationText}
            </div>
            <a href="javascript:void(0)" onclick="openDetailsModal(${donor.id})" class="btn btn-outline contact-btn">
                <i class="ph-fill ph-eye"></i> View Details
            </a>
        `;
        grid.appendChild(card);
    });

    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(allDonors.length / ITEMS_PER_PAGE);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous
    html += `<button class="page-btn" onclick="renderPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="ph ph-caret-left"></i></button>`;

    // Page Numbers (simplified: show all if < 10, else range)
    // For simplicity showing max 5-7 buttons logic could be added, but simple for now

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) html += `<button class="page-btn" onclick="renderPage(1)">1</button>`;
    if (startPage > 2) html += `<span>...</span>`;

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="renderPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages - 1) html += `<span>...</span>`;
    if (endPage < totalPages) html += `<button class="page-btn" onclick="renderPage(${totalPages})">${totalPages}</button>`;

    // Next
    html += `<button class="page-btn" onclick="renderPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="ph ph-caret-right"></i></button>`;

    container.innerHTML = html;
}

function searchDonors() {
    fetchDonors();
}

// Modal Functions
function openRegisterModal() {
    document.getElementById('registerModal').classList.add('show');
    document.body.classList.add('modal-open');
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('show');
    document.body.classList.remove('modal-open');
}

// Close modal when clicking outside
window.onclick = function (event) {
    const regModal = document.getElementById('registerModal');
    const detModal = document.getElementById('donorDetailsModal');
    if (event.target == regModal) {
        closeRegisterModal();
    }
    if (event.target == detModal) {
        closeDetailsModal();
    }
}

// Details Modal
function openDetailsModal(id) {
    const donor = allDonors.find(d => d.id === id);
    if (!donor) return;

    const content = document.getElementById('donorDetailsContent');
    const callBtn = document.getElementById('modalCallBtn');

    // Availability Logic
    let availability = '<span style="color: #2e7d32; font-weight: bold;">Available</span>';
    if (donor.last_donation_date) {
        const lastDate = new Date(donor.last_donation_date);
        if (!isNaN(lastDate)) {
            const today = new Date();
            const diffTime = Math.abs(today - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 90) {
                const eligibleDate = new Date(lastDate);
                eligibleDate.setDate(eligibleDate.getDate() + 90);
                availability = `<span style="color: #e53935; font-weight: bold;">Not Available</span> <br><small>Eligible after ${eligibleDate.toLocaleDateString()}</small>`;
            }
        }
    }

    content.innerHTML = `
        <div class="info-item">
            <i class="ph-fill ph-user info-icon"></i>
            <div>
                <label>Name</label>
                <p><strong>${donor.name}</strong></p>
            </div>
        </div>
        <div class="info-item">
            <i class="ph-fill ph-cake info-icon"></i>
             <div>
                <label>Age</label>
                <p>${donor.age ? donor.age + ' Years' : 'N/A'}</p>
            </div>
        </div>
        <div class="info-item">
            <i class="ph-fill ph-drop info-icon"></i>
             <div>
                <label>Blood Group</label>
                <p><strong>${donor.blood_group}</strong></p>
            </div>
        </div>
        <div class="info-item">
            <i class="ph-fill ph-phone info-icon"></i>
             <div>
                <label>Phone Number</label>
                <p><a href="tel:${donor.phone}" style="color: var(--text-dark); text-decoration: none;">${donor.phone}</a></p>
            </div>
        </div>
        <div class="info-item">
            <i class="ph-fill ph-map-pin info-icon"></i>
             <div>
                <label>Location</label>
                <p>${donor.location}</p>
            </div>
        </div>
         <div class="info-item">
            <i class="ph-fill ph-clock info-icon"></i>
             <div>
                <label>Last Donation</label>
                <p>${donor.last_donation_date || 'No record'}</p>
            </div>
        </div>
         <div class="info-item">
            <i class="ph-fill ph-check-circle info-icon"></i>
             <div>
                <label>Availability</label>
                <p>${availability}</p>
            </div>
        </div>
    `;

    callBtn.href = `tel:${donor.phone}`;
    document.getElementById('donorDetailsModal').classList.add('show');
    document.body.classList.add('modal-open');
}

function closeDetailsModal() {
    document.getElementById('donorDetailsModal').classList.remove('show');
    document.body.classList.remove('modal-open');
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch('/api/blood-donors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            alert('Registration Successful!');
            closeRegisterModal();
            form.reset();
            // Refresh list
            fetchDonors();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to register');
    }
}

// Mobile Menu Toggle
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Theme Handling
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    const heroImage = document.getElementById('heroImage');
    const isDark = body.classList.toggle('dark-mode');

    if (isDark) {
        icon.classList.replace('ph-moon', 'ph-sun');
        localStorage.setItem('theme', 'dark');
        if (heroImage) heroImage.src = 'images/hero_dark.png';
    } else {
        icon.classList.replace('ph-sun', 'ph-moon');
        localStorage.setItem('theme', 'light');
        if (heroImage) heroImage.src = 'images/hero.png';
    }
}

// Initialize Theme
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('themeIcon');
    const heroImage = document.getElementById('heroImage');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        icon.classList.replace('ph-moon', 'ph-sun');
        if (heroImage) heroImage.src = 'images/hero_dark.png';
    }
});
