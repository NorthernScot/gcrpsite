// Modal open/close logic
const signInModal = document.getElementById('signInModal');
const signUpModal = document.getElementById('signUpModal');
const openSignIn = document.getElementById('openSignIn');
const openSignUp = document.getElementById('openSignUp');
const closeSignIn = document.getElementById('closeSignIn');
const closeSignUp = document.getElementById('closeSignUp');

openSignIn.onclick = () => { signInModal.style.display = 'flex'; };
openSignUp.onclick = () => { signUpModal.style.display = 'flex'; };
closeSignIn.onclick = () => { signInModal.style.display = 'none'; };
closeSignUp.onclick = () => { signUpModal.style.display = 'none'; };
window.onclick = (e) => {
  if (e.target === signInModal) signInModal.style.display = 'none';
  if (e.target === signUpModal) signUpModal.style.display = 'none';
};

// Sign In form logic
const signInForm = document.getElementById('signInForm');
const signInError = document.getElementById('signInError');
signInForm.onsubmit = async (e) => {
  e.preventDefault();
  signInError.textContent = '';
  const email = document.getElementById('signInEmail').value;
  const password = document.getElementById('signInPassword').value;
  const remember = document.getElementById('signInRemember').checked;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) {
      signInError.textContent = data.message || 'Login failed.';
      return;
    }
    // Store JWT (localStorage or cookie)
    if (remember) {
      localStorage.setItem('gcrp_token', data.token);
    } else {
      sessionStorage.setItem('gcrp_token', data.token);
    }
    window.location.reload();
  } catch (err) {
    signInError.textContent = 'Server error.';
  }
};

// Sign Up form logic
const signUpForm = document.getElementById('signUpForm');
const signUpError = document.getElementById('signUpError');
signUpForm.onsubmit = async (e) => {
  e.preventDefault();
  signUpError.textContent = '';
  const username = document.getElementById('signUpUsername').value;
  const email = document.getElementById('signUpEmail').value;
  const password = document.getElementById('signUpPassword').value;
  const confirm = document.getElementById('signUpConfirmPassword').value;
  const discord_id = document.getElementById('signUpDiscord').value;
  if (password !== confirm) {
    signUpError.textContent = 'Passwords do not match.';
    return;
  }
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, discord_id })
    });
    const data = await res.json();
    if (!data.success) {
      signUpError.textContent = data.message || 'Registration failed.';
      return;
    }
    // Store JWT
    localStorage.setItem('gcrp_token', data.token);
    window.location.reload();
  } catch (err) {
    signUpError.textContent = 'Server error.';
  }
};

// Discord login button
const discordLoginBtn = document.getElementById('discordLoginBtn');
discordLoginBtn.onclick = () => {
  // Redirect to Discord OAuth (update URL if needed)
  window.location.href = '/api/discord/login';
};

// --- Navbar User Info Logic ---
async function updateNavbarUser() {
  const token = localStorage.getItem('gcrp_token') || sessionStorage.getItem('gcrp_token');
  const navbarAuth = document.getElementById('navbar-auth');
  const navbarUser = document.getElementById('navbar-user');
  if (!token) {
    navbarAuth.style.display = '';
    navbarUser.style.display = 'none';
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!data.success || !data.user) throw new Error();
    // Build user info
    const user = data.user;
    let avatar = user.profile_picture || '/default-avatar.png';
    let name = user.username || user.email;
    let badge = (user.roles && user.roles.length > 0) ? user.roles[0].name : '';
    let badgeDisplay = (user.roles && user.roles.length > 0) ? user.roles[0].displayName || user.roles[0].name : '';
    // HTML
    navbarUser.innerHTML = `
      <button class="navbar-user-btn" id="userDropdownBtn">
        <img src="${avatar}" class="user-avatar" alt="Avatar" />
        <span>${name}</span>
        ${badgeDisplay ? `<span class="user-badge">${badgeDisplay}</span>` : ''}
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="margin-left:0.3em;"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0l-4.25-4.39a.75.75 0 0 1 .02-1.06z"/></svg>
      </button>
      <div class="user-dropdown" id="userDropdownMenu">
        <a href="#" id="profileLink">Profile</a>
        <button id="logoutBtn">Logout</button>
      </div>
    `;
    navbarAuth.style.display = 'none';
    navbarUser.style.display = 'flex';
    // Dropdown logic
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    userDropdownBtn.onclick = (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle('show');
    };
    document.body.addEventListener('click', () => {
      userDropdownMenu.classList.remove('show');
    });
    userDropdownMenu.onclick = (e) => { e.stopPropagation(); };
    // Logout
    document.getElementById('logoutBtn').onclick = () => {
      localStorage.removeItem('gcrp_token');
      sessionStorage.removeItem('gcrp_token');
      window.location.reload();
    };
    // Profile link (now links to profile.html?user=USERNAME)
    document.getElementById('profileLink').onclick = (e) => {
      e.preventDefault();
      window.location.href = '/profile.html?user=' + encodeURIComponent(user.username);
    };
  } catch {
    navbarAuth.style.display = '';
    navbarUser.style.display = 'none';
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', updateNavbarUser); 