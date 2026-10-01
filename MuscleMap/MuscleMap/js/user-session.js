(async function initUserSession() {
  if (!window.MuscleMapAuth) return;

  await MuscleMapAuth.ensureSession();
  const session = MuscleMapAuth.getSession();
  if (!session) return;

  const initial = (session.name || "U").charAt(0).toUpperCase();
  const el = document.getElementById("profileInitial");
  if (el) el.textContent = initial;

  try {
    await MuscleMapDB.init();
    const prefs = await MuscleMapDB.getPreferences(session.email);
    document.body.dataset.theme = prefs.theme === "light" ? "light" : "dark";
    document.body.dataset.animations = prefs.animations === false ? "off" : "on";

    if (prefs.defaultDifficulty && prefs.defaultDifficulty !== "All") {
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.level === prefs.defaultDifficulty);
      });
    }
  } catch {
    /* preferences optional when offline */
  }
})();
