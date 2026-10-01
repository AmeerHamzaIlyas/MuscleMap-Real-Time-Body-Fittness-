const THEME_KEY = "musclemap_theme";

function applyTheme(theme) {
  document.body.dataset.theme = theme === "light" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, theme);
}

async function loadProfile() {
  await MuscleMapDB.init();
  await MuscleMapAuth.ensureSession();
  const session = MuscleMapAuth.getSession();
  if (!session?.email) {
    window.location.href = "login.html";
    return;
  }

  const user = await MuscleMapDB.findUserByEmail(session.email);
  const prefs = await MuscleMapDB.getPreferences(session.email);
  const favorites = await MuscleMapDB.getFavorites(session.email);

  const initial = (session.name || "U").charAt(0).toUpperCase();
  document.getElementById("profileAvatar").textContent = initial;
  document.getElementById("profileName").textContent = session.name;
  document.getElementById("profileEmail").textContent = session.email;

  if (user?.createdAt) {
    const date = new Date(user.createdAt).toLocaleDateString();
    document.getElementById("profileJoined").textContent = `Member since ${date}`;
  }

  document.getElementById("statFavCount").textContent = favorites.length;
  document.getElementById("statMuscleCount").textContent = "12";
  document.getElementById("statExerciseCount").textContent = "120";

  const form = document.getElementById("settingsForm");
  form.theme.value = prefs.theme || "dark";
  form.units.value = prefs.units || "metric";
  form.defaultDifficulty.value = prefs.defaultDifficulty || "All";
  form.animations.checked = prefs.animations !== false;
  form.showWorkoutTips.checked = prefs.showWorkoutTips !== false;

  applyTheme(form.theme.value);
}

document.getElementById("settingsForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const session = MuscleMapAuth.getSession();
  if (!session?.email) return;

  const form = e.target;
  const prefs = {
    theme: form.theme.value,
    units: form.units.value,
    defaultDifficulty: form.defaultDifficulty.value,
    animations: form.animations.checked,
    showWorkoutTips: form.showWorkoutTips.checked,
  };

  await MuscleMapDB.savePreferences(session.email, prefs);
  applyTheme(prefs.theme);

  const status = document.getElementById("settingsStatus");
  status.textContent = "Settings saved successfully.";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  MuscleMapAuth.logout();
});

loadProfile();
