/* -------- UTILITIES -------- */
function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

/* -------- API URL (same host and port as the served website) -------- */
const API_URL = '/api/v1';

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
const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");

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

    if (loginMode === "user" && !email.toLowerCase().endsWith("@ppsu.ac.in")) {
        msg.innerText = "Use a PPSU email address.";
        return;
    }

    const endpoint = isLogin ? "login" : "signup";
    const role = loginMode;

    try {
        msg.innerText = "Connecting...";
        const response = await fetch(`${API_URL}/users/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });
        const data = await response.json();

        if (data.success) {
            if (isLogin) {
                localStorage.setItem("user", JSON.stringify({ email, role }));
                showHome()
            } else {
                toast("Signup successful! Please login.");
                isLogin = true;
                updateLoginUi();
            }
        } else {
            msg.innerText = data.message || "Login failed.";
        }
    } catch (error) {
        console.error(error);
        msg.innerText = "Cannot connect to the server. Please run the backend.";
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

    const adminDashboard = document.getElementById("adminDashboard");
    if (user.role === "admin") {
        console.log("[HOME] Loading Admin Dashboard.");
        if (adminDashboard) adminDashboard.style.display = "block";
        loadUsers();
    } else {
        console.log("[HOME] Normal User Mode.");
        if (adminDashboard) adminDashboard.style.display = "none";
    }
}

const loadUsers = async () => {
    const userTableBody = document.getElementById("userTableBody");
    if (!userTableBody) return;

    console.log("[ADMIN] Fetching user database...");
    const res = await fetch(`${API_URL}/users`);
    const data = await res.json();
    console.log("[ADMIN] Received users:", data);

    if (data.success && data.users) {
        if (Object.keys(data.users).length === 0) {
            userTableBody.innerHTML = "<tr><td colspan='3' style='text-align:center'>No registered users.</td></tr>";
            return;
        }

        userTableBody.innerHTML = Object.entries(data.users)
            .map(([email, u]) => {
                const pass = u.password || u;
                const role = u.role || "user";
                return `
                <tr>
                    <td>${email}</td>
                    <td>${pass}</td>
                    <td><span class="status-badge ${role === "admin" ? "approved" : "pending"}">${role}</span></td>
                </tr>
            `;
            })
            .join("");
    } else {
        userTableBody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:red'>Error loading user data!</td></tr>";
    }
};

window.enroll = async (gameName) => {
    alert("Enrollment feature currently disabled.");
};

if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.removeItem("user");
        location.reload();
    };
}

/* -------- AUTO CHECK -------- */
window.onload = () => {
    if (loader) loader.style.display = "none";
    if (loginTitle) {
        updateLoginUi();
    }

    const user = localStorage.getItem("user");
    if (user) {
        showHome();
    }
};
