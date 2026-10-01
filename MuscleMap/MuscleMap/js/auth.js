const SESSION_KEY = "musclemap_session";
let cachedSession = null;

function getSession() {
  return cachedSession;
}

function setSession(user) {
  cachedSession = { name: user.name, email: user.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(cachedSession));
}

async function clearSession() {
  cachedSession = null;
  localStorage.removeItem(SESSION_KEY);
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* ignore */
  }
}

async function fetchSession() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (!response.ok) {
      cachedSession = null;
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const user = await response.json();
    setSession(user);
    return user;
  } catch {
    return getSessionFromStorage();
  }
}

function getSessionFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (stored?.email) {
      cachedSession = stored;
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function ensureSession() {
  if (cachedSession) return cachedSession;
  const online = await fetchSession();
  if (online) return online;
  return getSessionFromStorage();
}

function showAuthError(form, message) {
  let el = form.querySelector(".auth-error");
  if (!el) {
    el = document.createElement("p");
    el.className = "auth-error";
    form.prepend(el);
  }
  el.textContent = message;
}

function showAuthSuccess(form, message) {
  let el = form.querySelector(".auth-success");
  if (!el) {
    el = document.createElement("p");
    el.className = "auth-success";
    form.prepend(el);
  }
  el.textContent = message;
}

async function initAuthPage() {
  await ensureSession();

  if (getSession() && /login\.html|register\.html/.test(location.pathname)) {
    window.location.href = "index.html";
    return;
  }

  if (!getSession() && /index\.html|profile\.html/.test(location.pathname)) {
    window.location.href = "login.html";
  }
}

document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();
  const email = this.querySelector('[name="email"]').value.trim().toLowerCase();
  const password = this.querySelector('[name="password"]').value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      showAuthError(this, err.message || "Invalid email or password. Please try again.");
      return;
    }

    const user = await response.json();
    setSession(user);
    window.location.href = "index.html";
  } catch {
    showAuthError(this, "Cannot reach server. Run the app with: dotnet run --project MuscleMap.Web");
  }
});

document.getElementById("registerForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = this.querySelector('[name="name"]').value.trim();
  const email = this.querySelector('[name="email"]').value.trim().toLowerCase();
  const password = this.querySelector('[name="password"]').value;

  if (password.length < 6) {
    showAuthError(this, "Password must be at least 6 characters.");
    return;
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (response.status === 409) {
      showAuthError(this, "An account with this email already exists.");
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      showAuthError(this, err.message || "Could not create account. Please try again.");
      return;
    }

    const user = await response.json();
    setSession(user);
    showAuthSuccess(this, "Account created! Redirecting...");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 700);
  } catch {
    showAuthError(this, "Cannot reach server. Run the app with: dotnet run --project MuscleMap.Web");
  }
});

initAuthPage();

window.MuscleMapAuth = {
  getSession,
  setSession,
  clearSession,
  ensureSession,
  async logout() {
    await clearSession();
    window.location.href = "login.html";
  },
};
