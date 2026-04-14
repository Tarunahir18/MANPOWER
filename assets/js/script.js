function toasty(msg, type = 'success') {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerText = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => {
        t.classList.remove("show");
        t.classList.remove(type);
    }, 3000);
}
window.showToast = toasty; // Legacy support

/* -------- API URL -------- */
const createApiCandidates = () => {
    const { protocol, hostname, port, origin } = window.location;
    const host = hostname || 'localhost';
    const scheme = protocol === 'file:' ? 'http:' : protocol;
    const currentPort = port || (scheme === 'https:' ? '443' : '80');
    const ports = ['3000', '3001', '3002', '5000', '5001', '8000', '8080', '5500', '5501'];
    const candidates = [];

    if (protocol !== 'file:') {
        candidates.push(`${origin}/api/v1`);
    }

    ports.forEach((p) => candidates.push(`${scheme}//${host}:${p}/api/v1`));
    candidates.push('http://localhost:3000/api/v1', 'http://127.0.0.1:3000/api/v1', 'http://localhost:8080/api/v1');

    return [...new Set(candidates)];
};

async function detectApiUrl() {
    if (window.__API_URL__) return window.__API_URL__;

    // 1. Check Caching (Huge speedup)
    const cached = localStorage.getItem('__STORED_API_URL__');
    if (cached) {
        window.__API_URL__ = cached;
        // Verify in background to keep it fresh, but return immediately
        fetch(`${cached}/health`).then(res => {
            if (!res.ok) localStorage.removeItem('__STORED_API_URL__');
        }).catch(() => localStorage.removeItem('__STORED_API_URL__'));
        return cached;
    }

    console.log('[API] Detecting backend...');
    const candidates = createApiCandidates();
    
    // 2. Faster Probing logic
    return new Promise((resolve) => {
        let resolved = false;
        const fallback = 'http://localhost:3000/api/v1';
        
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                window.__API_URL__ = fallback;
                resolve(fallback);
            }
        }, 1500);

        candidates.forEach(async (base) => {
            try {
                const controller = new AbortController();
                const nodeTimeout = setTimeout(() => controller.abort(), 1000);
                const response = await fetch(`${base}/health`, { signal: controller.signal });
                clearTimeout(nodeTimeout);
                
                if (response.ok && !resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    window.__API_URL__ = base;
                    localStorage.setItem('__STORED_API_URL__', base);
                    console.log('[API] Found at:', base);
                    resolve(base);
                }
            } catch (e) { /* silent fail */ }
        });
    });
}

window.getApiUrl = detectApiUrl;
/* -------- GLOBAL UTILITIES -------- */
/* -------- GLOBAL UTILITIES -------- */
const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return { email: userStr, role: userStr.toLowerCase().includes('admin') ? 'admin' : 'user' };
    }
};

const apiRequest = async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const user = getCurrentUser();
    if (user?.role) {
        headers['x-user-role'] = user.role;
    }

    const apiBase = await detectApiUrl();
    const url = `${apiBase}${path}`;
    console.log(`[API] Requesting: ${url}`, options);
    let response;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s total request timeout

        response = await fetch(url, { 
            ...options, 
            headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
    } catch (fetchError) {
        console.error(`[API] Fetch Error for ${url}:`, fetchError);
        const error = new Error(fetchError.name === 'AbortError' ? 'Server connection timed out' : (fetchError.message || 'Network request failed'));
        error.isNetworkError = true;
        throw error;
    }

    const text = await response.text().catch(() => '');
    let data = { success: false, message: text || 'Invalid response from server' };
    try {
        data = JSON.parse(text);
    } catch {
        // keep text fallback message
    }

    if (!response.ok) {
        const error = new Error(data.message || response.statusText || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
};

// toasty function is already declared at the top as a function declaration.

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = (password) => typeof password === 'string' && password.length >= 4;

const setTheme = (theme) => {
    const normalized = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme', normalized === 'light');
    localStorage.setItem('pps_theme', normalized);
    
    const controller = document.querySelector('.theme-controller');
    if (controller) {
        const darkSeg = controller.querySelector('.segment.dark');
        const lightSeg = controller.querySelector('.segment.light');
        if (darkSeg && lightSeg) {
            darkSeg.classList.toggle('active', normalized === 'dark');
            lightSeg.classList.toggle('active', normalized === 'light');
        }
    }
};

const loadTheme = () => {
    const saved = localStorage.getItem('pps_theme');
    setTheme(saved === 'light' ? 'light' : 'dark');
};

const toggleTheme = () => {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
};

const ensureUIHelpers = () => {
    // Global styles are now handled by styles.css
    // This function is kept as a no-op for backward compatibility
};

const setupNavControls = () => {
    // Nav controls are now handled by the HTML templates and styles.css
};

const addNotification = (text) => {
    const key = 'pps_notifications';
    const notifications = JSON.parse(localStorage.getItem(key) || '[]');
    notifications.unshift({ id: Date.now(), text, date: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(notifications.slice(0, 50)));
};

const loadNotifications = () => {
    const list = document.getElementById('notificationList');
    if (!list) return;
    const notifications = JSON.parse(localStorage.getItem('pps_notifications') || '[]');
    if (!notifications.length) {
        list.innerHTML = '<li>No notifications yet.</li>';
        return;
    }
    list.innerHTML = notifications.map(n => `<li><strong>${new Date(n.date).toLocaleString()}:</strong> ${n.text}</li>`).join('');
};

const applyProfileBadges = () => {
    const badgeBox = document.getElementById('badgeBox');
    if (!badgeBox) return;
    const user = getCurrentUser();
    if (!user) return;
    const enrolledCount = (user.enrolled || []).length;
    const badges = [];
    if (enrolledCount >= 1) badges.push('Beginner Badge');
    if (enrolledCount >= 2) badges.push('Team Player Badge');
    if (enrolledCount >= 4) badges.push('Champion Badge');
    if (enrolledCount >= 6) badges.push('Legend Badge');
    badgeBox.innerHTML = badges.length
        ? badges.map(label => `<span class="badge-pill">${label}</span>`).join(' ')
        : '<div class="badge-pill" style="opacity:.7;">No badges yet. Enroll to earn rewards.</div>';
};

const changeUserRole = async (email, role) => {
    try {
        const data = await apiRequest(`/users/${encodeURIComponent(email)}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
        toasty(data.message || 'Role updated');
        loadUsers();
    } catch (err) {
        toasty(err.message || 'Role update failed', 'error');
    }
};

const downloadCsv = (filename, rows) => {
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const exportUsersCsv = async () => {
    try {
        const data = await apiRequest('/users');
        if (data.success && data.users) {
            const rows = Object.entries(data.users).map(([email, user]) => ({
                email,
                role: user.role || 'user',
                enrolled: (user.enrolled || []).join('; '),
                activities: (user.activities || []).map(a => `${a.action} ${a.game}`).join('; ')
            }));
            if (!rows.length) {
                toasty('No users to export', 'error');
                return;
            }
            downloadCsv('pps_users.csv', rows);
        }
    } catch (error) {
        console.error(error);
        toasty('Could not export users', 'error');
    }
};

const bookSchedule = (eventName) => {
    const bookings = JSON.parse(localStorage.getItem('pps_bookings') || '[]');
    const user = getCurrentUser();
    if (!user) {
        toasty('Please login before booking', 'error');
        return;
    }
    bookings.unshift({ user: user.email, event: eventName, date: new Date().toISOString() });
    localStorage.setItem('pps_bookings', JSON.stringify(bookings.slice(0, 30)));
    addNotification(`${user.email} booked ${eventName}`);
    toasty(`Booked ${eventName}`);
};

const loadScheduleBookings = () => {
    const bookingsEl = document.getElementById('bookingHistory');
    if (!bookingsEl) return;
    const bookings = JSON.parse(localStorage.getItem('pps_bookings') || '[]');
    if (!bookings.length) {
        bookingsEl.innerHTML = '<li>No current bookings.</li>';
        return;
    }
    bookingsEl.innerHTML = bookings.map(b => `<li><strong>${b.event}</strong> by ${b.user} on ${new Date(b.date).toLocaleDateString()}</li>`).join('');
};

const initGlobalUI = () => {
    loadTheme();
    setupNavControls();
    loadNotifications();
    applyProfileBadges();
    loadScheduleBookings();
};

/* -------- ELEMENTS -------- */
const loginPage = document.getElementById("loginPage");
const homePage = document.getElementById("homePage");
const loader = document.getElementById("loader");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const toggleLink = document.getElementById("toggleLink");
const msg = document.getElementById("message");
const userTypeBtn = document.getElementById("userTypeBtn");
const adminTypeBtn = document.getElementById("adminTypeBtn");
const loginTitle = document.getElementById("loginTitle");
const modeNote = document.getElementById("modeNote");
const logoutBtn = document.getElementById("logoutBtn");

function showHome() {
    if (loader) loader.style.display = "none";
    if (loginPage) loginPage.style.display = "none";
    if (homePage) homePage.style.display = "block";
    updateWelcomeText();
}

function showLogin() {
    if (loader) loader.style.display = "none";
    if (loginPage) loginPage.style.display = "block";
    if (homePage) homePage.style.display = "none";
}

function updateWelcomeText() {
    const user = getCurrentUser();
    const welcome = document.getElementById("welcomeText");
    if (welcome && user) {
        welcome.innerText = user.email === "Admin" ? "Welcome, Admin" : `Hello, ${user.email}`;
    }
}

let isLogin = true;
let loginMode = "user";

function updateLoginUi() {
    if (!loginTitle || !emailInput || !submitBtn || !toggleLink) return;

    const isUser = loginMode === "user";
    userTypeBtn?.classList.toggle("active", isUser);
    adminTypeBtn?.classList.toggle("active", !isUser);
    toggleLink.style.display = isUser ? "block" : "none";

    if (isUser) {
        loginTitle.innerText = isLogin ? "Student Login" : "Student Sign Up";
        if (modeNote) modeNote.innerText = isLogin
            ? "Use your PPSU email to login or sign up."
            : "Create a new student account with your PPSU email.";
        emailInput.placeholder = "PPSU Email";
        submitBtn.innerText = isLogin ? "Login" : "Sign Up";
        toggleLink.innerText = isLogin ? "New user? Sign up here" : "Already have an account?";
    } else {
        loginTitle.innerText = "Admin Login";
        if (modeNote) modeNote.innerText = "Admin login only. Signup is not available.";
        emailInput.placeholder = "Admin Username";
        submitBtn.innerText = "Login";
    }
    msg.innerText = "";

    // Toggle Google Sign-In button visibility (only for student mode)
    const googleBtn = document.getElementById('googleSignInBtn');
    const googleDivider = document.getElementById('googleDivider');
    if (googleBtn) googleBtn.style.display = isUser ? 'flex' : 'none';
    if (googleDivider) googleDivider.style.display = isUser ? 'flex' : 'none';
}

if (userTypeBtn) {
    userTypeBtn.onclick = () => {
        loginMode = "user";
        isLogin = true;
        updateLoginUi();
    };
}

if (adminTypeBtn) {
    adminTypeBtn.onclick = () => {
        loginMode = "admin";
        isLogin = true;
        updateLoginUi();
    };
}

if (toggleLink) {
    toggleLink.onclick = () => {
        isLogin = !isLogin;
        updateLoginUi();
    };
}

async function handleAuth() {
    if (!emailInput || !passInput || !msg || !submitBtn) return;

    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    if (!email || !password) {
        msg.innerText = "Please fill in all fields.";
        return;
    }

    if (loginMode === "admin" && !isLogin) {
        msg.innerText = "Admin cannot sign up here.";
        return;
    }

    if (loginMode === "user" && !validEmail(email)) {
        msg.innerText = "Use a valid email address.";
        return;
    }

    if (!validPassword(password)) {
        msg.innerText = "Password must be at least 4 characters.";
        return;
    }

    const endpoint = isLogin ? "login" : "signup";
    const role = loginMode;

    try {
        msg.innerText = "⏳ Connecting to server...";
        msg.style.color = "var(--primary)";
        msg.style.background = "var(--primary-glow)";
        msg.style.borderColor = "var(--primary-border)";
        msg.style.display = "block";
        
        let data;
        let backendFailed = false;
        let backendErrorMessage = '';
        const apiBase = await detectApiUrl();

        try {
            data = await apiRequest(`/users/${endpoint}`, {
                method: "POST",
                body: JSON.stringify({ email, password, role })
            });
        } catch (backendError) {
            if (backendError.isNetworkError) {
                console.warn("[AUTH] Backend not reachable, falling back to direct DB connection.", backendError);
                backendFailed = true;
            } else {
                backendErrorMessage = backendError.message || "Login failed.";
            }
        }

        if (!backendFailed) {
            if (backendErrorMessage) {
                msg.innerText = backendErrorMessage;
                return;
            }

            if (data) {
                if (data.success) {
                    if (isLogin) {
                        localStorage.setItem("user", JSON.stringify({ email, role: data.role || role, enrolled: [], activities: [] }));
                        showHome();
                    } else {
                        toasty("Signup successful! Please login.");
                        isLogin = true;
                        updateLoginUi();
                    }
                    return;
                }

                msg.innerText = data.message || "Login failed.";
                return;
            }
        }

        // DIRECT DATABASE FALLBACK (Only if script.js has access to window.supabase)
        const SUPABASE_URL = 'https://merpbfceascuopcgqwiw.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcnBiZmNlYXNjdW9wY2dxd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjA2ODcsImV4cCI6MjA5MTczNjY4N30.r-0Pz6l7N7N7S4wrpHpxCCv5JBSKhDgDmq3tl0Sq8ro';
        
        let _dbClient = null;
        if (window.supabase) {
            try {
                _dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            } catch (supaError) {
                console.error("[SUPABASE] Client init failed:", supaError);
            }
        }
        
        if (!_dbClient) {
            msg.innerText = "❌ Connection failed. Please ensure the backend server is running.";
            msg.style.color = "var(--danger)";
            msg.style.background = "rgba(211, 47, 47, 0.08)";
            msg.style.borderColor = "rgba(211, 47, 47, 0.15)";
            return;
        }

        msg.innerText = "⏳ Server busy, using direct DB sync...";

        if (role === "admin" && isLogin) {
            if (email === "admin" && password === "1234") {
                localStorage.setItem("user", JSON.stringify({ email: "Admin", role: "admin", enrolled: [], activities: [] }));
                showHome();
            } else {
                msg.innerText = "❌ Invalid admin credentials";
                msg.style.color = "var(--danger)";
            }
            return;
        }

        if (isLogin) {
            const { data: user, error: dbError } = await _dbClient.from('users').select('*').eq('email', email).single();
            if (dbError || !user || user.password !== password) {
                msg.innerText = "❌ Invalid login credentials";
                msg.style.color = "var(--danger)";
                return;
            }
            localStorage.setItem("user", JSON.stringify({ email: user.email, role: user.role, enrolled: [], activities: [] }));
            showHome();
        } else {
            const { data: existing } = await _dbClient.from('users').select('email').eq('email', email).single();
            if (existing) {
                msg.innerText = "❌ User already exists";
                msg.style.color = "var(--danger)";
                return;
            }
            const { error: insertError } = await _dbClient.from('users').insert([{ email, password, role: role || 'user' }]);
            if (insertError) {
                msg.innerText = "❌ " + (insertError.message || "Signup failed in database");
                msg.style.color = "var(--danger)";
                return;
            }
            toasty("Signup successful! Please login.");
            isLogin = true;
            updateLoginUi();
        }
    } catch (error) {
        console.error(error);
        msg.innerText = "❌ An unexpected error occurred.";
        msg.style.color = "var(--danger)";
    }
}

if (submitBtn) {
    submitBtn.onclick = handleAuth;
}

/* -------- VIEW CONTROLS -------- */
async function showHome() {
    console.log("[HOME] Entering showHome...");
    const userStr = localStorage.getItem("user");

    if (!userStr || userStr === "null") {
        console.warn("[HOME] No user found, showing login page.");
        if (loginPage) loginPage.style.display = "block";
        if (homePage) homePage.style.display = "none";
        return;
    }

    if (loginPage) loginPage.style.display = "none";
    if (homePage) homePage.style.display = "block";

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        user = { email: userStr, role: userStr.toLowerCase().includes("admin") ? "admin" : "user" };
    }

    console.log("[HOME] User detected:", user);

    if (welcomeText) {
        welcomeText.innerText = `Hello, ${user.email.split("@")[0]}!`;
    }

    // Show/Hide role-based navigation
    const adminLinks = document.querySelectorAll('.nav-links .admin-only');
    const userLinks = document.querySelectorAll('.nav-links .user-only');
    
    adminLinks.forEach(link => {
        link.classList.toggle('show', user.role === 'admin');
    });
    userLinks.forEach(link => {
        link.classList.toggle('show', user.role !== 'admin');
    });

    const adminDashboard = document.getElementById("adminDashboard");
    const studentDashboard = document.getElementById("studentDashboard");
    
    if (user.role === "admin") {
        console.log("[HOME] Loading Admin Dashboard.");
        if (adminDashboard) adminDashboard.style.display = "block";
        if (studentDashboard) studentDashboard.style.display = "none";
        loadUsers();
        loadAdminStats();
    } else {
        console.log("[HOME] Normal User Mode.");
        if (adminDashboard) adminDashboard.style.display = "none";
        if (studentDashboard) studentDashboard.style.display = "block";
    }
    
    // Load tournaments universally
    loadTournaments();
}

const loadUsers = async () => {
    const userTableBody = document.getElementById("userTableBody");
    if (!userTableBody) return;

    try {
        console.log("[ADMIN] Fetching user database...");
        const data = await apiRequest('/users');
        console.log("[ADMIN] Received users:", data);

        if (data.success && data.users) {
            if (Object.keys(data.users).length === 0) {
                userTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center'>No registered users.</td></tr>";
                return;
            }

            userTableBody.innerHTML = Object.entries(data.users)
                .map(([email, u]) => {
                    const pass = u.password || u;
                    const role = u.role || "user";
                    const enrolled = u.enrolled || [];
                    return `
                    <tr>
                        <td>${email}</td>
                        <td>${pass}</td>
                        <td><span class="status-badge ${role === "admin" ? "admin-badge" : role === "coach" ? "coach-badge" : "user-badge"}">${role}</span></td>
                        <td>${enrolled.length > 0 ? enrolled.join(', ') : 'None'}</td>
                        <td>
                            <button class="action-btn edit-btn" onclick="changeUserRole('${email}', 'user')">User</button>
                            <button class="action-btn edit-btn" onclick="changeUserRole('${email}', 'coach')">Coach</button>
                            <button class="action-btn edit-btn" onclick="changeUserRole('${email}', 'admin')">Admin</button>
                            <button class="action-btn delete-btn" onclick="deleteUser('${email}')">Delete</button>
                        </td>
                    </tr>
                `;
                })
                .join("");
        } else {
            userTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:var(--danger)'>Error loading user data!</td></tr>";
        }
    } catch (error) {
        console.error('[ADMIN] Load users failed', error);
        userTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:var(--danger)'>Error loading user data.</td></tr>";
    }
};

const filterUsers = (query) => {
    const rows = document.querySelectorAll('#userTableBody tr');
    const normalized = query.trim().toLowerCase();
    rows.forEach(row => {
        const email = row.querySelector('td')?.innerText.toLowerCase() || '';
        row.style.display = !normalized || email.includes(normalized) ? '' : 'none';
    });
};

/* -------- LOAD ADMIN STATS -------- */
const loadAdminStats = async () => {
    try {
        const totalUsersCard = document.getElementById('totalUsersCard');
        const enrollmentsCard = document.getElementById('totalEnrollmentsCard');
        const activeUsersCard = document.getElementById('activeUsersCard');
        const pendingMessagesCard = document.getElementById('pendingMessagesCard');

        if (!totalUsersCard) return; // Not on dashboard

        const data = await apiRequest('/users');
        if (data.success && data.users) {
            const users = data.users;
            const totalUsers = Object.keys(users).length;
            let totalEnrollments = 0;
            let activeUsers = 0;
            Object.values(users).forEach(user => {
                const enrolled = user.enrolled || [];
                totalEnrollments += enrolled.length;
                if (enrolled.length > 0) activeUsers++;
            });
            
            if (totalUsersCard) totalUsersCard.innerText = totalUsers;
            if (enrollmentsCard) enrollmentsCard.innerText = totalEnrollments;
            if (activeUsersCard) activeUsersCard.innerText = activeUsers;
            
            try {
                const contactData = await apiRequest('/contacts');
                if (pendingMessagesCard) pendingMessagesCard.innerText = contactData.contacts?.length || 0;
            } catch (e) {
                if (pendingMessagesCard) pendingMessagesCard.innerText = '0';
            }
        }
    } catch (error) {
        console.error('[STATS] Error:', error);
    }
};

window.deleteUser = async (email) => {
    if (!confirm(`Delete user ${email}?`)) return;
    try {
        const data = await apiRequest(`/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
        if (data.success) {
            toasty(`User ${email} deleted`);
            loadUsers(); // Refresh table
        } else {
            toasty(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error(error);
        toasty(error.message || 'Error deleting user', 'error');
    }
};

/* -------- ENROLL IN GAME -------- */
window.enroll = async (gameName) => {
    const user = getCurrentUser();
    if (!user) {
        alert("Please login first.");
        return;
    }

    try {
        console.log(`[ENROLL] Enrolling ${user.email} in ${gameName}`);
        const data = await apiRequest('/users/enroll', {
            method: 'POST',
            body: JSON.stringify({ email: user.email, gameName })
        });
        console.log('[ENROLL] Response:', data);

        if (data.success) {
            toasty(`Enrolled in ${gameName}!`);
            user.enrolled = user.enrolled || [];
            if (!user.enrolled.includes(gameName)) {
                user.enrolled.push(gameName);
                user.activities = user.activities || [];
                user.activities.push({ action: 'enrolled', game: gameName, timestamp: new Date().toISOString() });
                localStorage.setItem('user', JSON.stringify(user));
            }
            addNotification(`${user.email} enrolled in ${gameName}`);
        } else {
            toasty(data.message || "Enrollment failed.", 'error');
        }
    } catch (error) {
        console.error('[ENROLL] Error:', error);
        toasty(error.message || "Error enrolling. Try again.", 'error');
    }
};

/* -------- TOURNAMENTS -------- */
window.handleCreateTournament = async (e) => {
    e.preventDefault();
    const name = document.getElementById('tName').value.trim();
    const venue = document.getElementById('tVenue').value.trim();
    const sport = document.getElementById('tSport').value;
    
    if (!name || !venue) return;
    try {
        const data = await apiRequest('/tournaments', {
            method: 'POST',
            body: JSON.stringify({ name, venue, sport })
        });
        if (data.success) {
            toasty(data.message); // Should say "Notified X students via email"
            document.getElementById('createTournamentForm').reset();
            loadTournaments();
        } else {
            toasty(data.message, 'error');
        }
    } catch(err) {
        toasty(err.message, 'error');
    }
};

window.loadTournaments = async () => {
    const list = document.getElementById('tournamentsList');
    if (!list) return;
    
    try {
        const data = await apiRequest('/tournaments');
        if (data.success && data.tournaments) {
            if (data.tournaments.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted);">No tournaments launched yet. Check back later!</p>';
                return;
            }
            // Reverse so newest is first
            list.innerHTML = [...data.tournaments].reverse().map(t => `
                <div class="tournament-card">
                    <div class="tournament-img">
                       <img src="${t.image}" alt="${t.venue}">
                       <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(0deg, rgba(9,20,37,0.9) 0%, rgba(9,20,37,0) 70%);"></div>
                       <span class="badge badge-success" style="position: absolute; bottom: 12px; left: 12px;">${t.sport}</span>
                    </div>
                    <div class="tournament-body">
                        <h4>${t.name}</h4>
                        <p>📍 Venue: ${t.venue}</p>
                        <button onclick="window.location.href='sport.html?game=' + encodeURIComponent('${t.name}')" class="btn-primary" style="width: 100%; font-size: 12px;">Enroll to Tournament →</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        list.innerHTML = '<p style="color:var(--danger);">Error loading tournaments.</p>';
    }
};

if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.removeItem("user");
        location.reload();
    };
}

/* -------- AUTO CHECK -------- */
const initApp = () => {
    if (loader) loader.style.display = "none";
    
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
    const isHomePage = path.endsWith('/index.html');
    const isDashPage = path.endsWith('admin-dashboard.html');

    if (loginTitle && isLoginPage) {
        updateLoginUi();
    }

    const userStr = localStorage.getItem("user");
    if (userStr && (isHomePage || isDashPage || isLoginPage)) {
        showHome(); 
    } else if (isLoginPage) {
        showLogin();
    }

    initGlobalUI();
    initializeRoleBasedMenu();
    loadTheme();

    // Register Service Worker for Offline Caching & Speed
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('[PWA] Service Worker Registered'))
            .catch(err => console.warn('[PWA] SW Registration Failed:', err));
    }
};

// Faster loading: don't wait for images
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Fallback to hide loader if everything else fails
setTimeout(() => { if(loader) loader.style.display="none"; }, 3000);

/* -------- INITIALIZE ROLE-BASED MENU -------- */
function initializeRoleBasedMenu() {
    const user = localStorage.getItem('user');
    if (!user) return;

    try {
        const userData = JSON.parse(user);
        const adminLinks = document.querySelectorAll('.admin-only');
        const userLinks = document.querySelectorAll('.user-only');
        
        adminLinks.forEach(link => {
            link.classList.toggle('show', userData.role === 'admin');
        });
        userLinks.forEach(link => {
            link.classList.toggle('show', userData.role !== 'admin');
        });
    } catch (e) {
        console.error('Error initializing role-based menu:', e);
    }
}
