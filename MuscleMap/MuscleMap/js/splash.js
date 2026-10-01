const SPLASH_MIN_MS = 2400;

function navigateAfterSplash(session) {
  const screen = document.getElementById("splashScreen");
  screen?.classList.add("exit");

  setTimeout(() => {
    window.location.href = session ? "index.html" : "login.html";
  }, 850);
}

async function startSplash() {
  const started = performance.now();

  let session = null;
  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (response.ok) {
      session = await response.json();
    }
  } catch {
    try {
      session = JSON.parse(localStorage.getItem("musclemap_session"));
    } catch {
      session = null;
    }
  }

  const elapsed = performance.now() - started;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);

  setTimeout(() => navigateAfterSplash(session), wait);
}

startSplash();
