/**
 * MuscleMap data layer — talks to the ASP.NET Core API (SQLite on the server).
 * Run the app with: dotnet run --project MuscleMap.Web
 */
const API_BASE = "";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  return response;
}

const MuscleMapDB = {
  async init() {
    return true;
  },

  async createUser({ name, email, password }) {
    const response = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Registration failed");
    }
    return response.json();
  },

  async findUserByEmail(email) {
    const response = await apiFetch("/api/user/profile");
    if (!response.ok) return null;
    const user = await response.json();
    void email;
    return {
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },

  async emailExists(email) {
    /* Registration endpoint returns 409 if email exists */
    void email;
    return false;
  },

  async savePreferences(email, prefs) {
    const response = await apiFetch("/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify({
        theme: prefs.theme,
        units: prefs.units,
        defaultDifficulty: prefs.defaultDifficulty,
        animations: prefs.animations,
        showWorkoutTips: prefs.showWorkoutTips,
      }),
    });
    if (!response.ok) throw new Error("Could not save preferences");
    return this.getPreferences(email);
  },

  async getPreferences(email) {
    const response = await apiFetch("/api/user/preferences");
    if (!response.ok) return { email, ...defaultPreferences() };
    const dto = await response.json();
    return {
      email,
      theme: dto.theme,
      units: dto.units,
      defaultDifficulty: dto.defaultDifficulty,
      animations: dto.animations,
      showWorkoutTips: dto.showWorkoutTips,
    };
  },

  async getFavorites(email) {
    void email;
    const response = await apiFetch("/api/user/favorites");
    if (!response.ok) return [];
    return response.json();
  },

  async saveFavorites(email, items) {
    void email;
    const response = await apiFetch("/api/user/favorites", {
      method: "PUT",
      body: JSON.stringify(items),
    });
    if (!response.ok) throw new Error("Could not save favorites");
  },

  async getCameraPoses() {
    const response = await apiFetch("/api/user/camera-poses");
    if (!response.ok) return null;
    return response.json();
  },

  async saveCameraPoses(poses) {
    const response = await apiFetch("/api/user/camera-poses", {
      method: "PUT",
      body: JSON.stringify(poses),
    });
    return response.ok;
  },
};

function defaultPreferences() {
  return {
    theme: "dark",
    units: "metric",
    animations: true,
    defaultDifficulty: "All",
    showWorkoutTips: true,
  };
}

window.MuscleMapDB = MuscleMapDB;
