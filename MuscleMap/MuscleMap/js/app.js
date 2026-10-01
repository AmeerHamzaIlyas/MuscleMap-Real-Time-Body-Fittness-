const POSE_STORAGE_KEY = "musclemap_camera_poses_v2";

/** Sketchfab embed camera angles — 0 front, 180 back, 90 side */
const DEFAULT_CAMERA_POSES = {
  Chest: { cameraDeg: 0, pitchDeg: 8, radius: 2.45, focusY: 0.15, duration: 1.2 },
  Abs: { cameraDeg: 0, pitchDeg: 2, radius: 2.35, focusY: -0.05, duration: 1.2 },
  Shoulders: { cameraDeg: 45, pitchDeg: 10, radius: 2.5, focusY: 0.25, duration: 1.2 },
  Biceps: { cameraDeg: 30, pitchDeg: 6, radius: 2.4, focusX: 0.08, focusY: 0.1, duration: 1.2 },
  Forearms: { cameraDeg: 60, pitchDeg: 0, radius: 2.35, focusX: 0.1, focusY: -0.05, duration: 1.2 },
  Back: { cameraDeg: 180, pitchDeg: 8, radius: 2.5, focusY: 0.15, duration: 1.2 },
  Triceps: { cameraDeg: 210, pitchDeg: 6, radius: 2.45, focusX: -0.08, focusY: 0.1, duration: 1.2 },
  Glutes: { cameraDeg: 200, pitchDeg: 4, radius: 2.45, focusY: -0.1, duration: 1.2 },
  Legs: { cameraDeg: 270, pitchDeg: -5, radius: 2.3, focusY: -0.35, duration: 1.2 },
  Calves: { cameraDeg: 260, pitchDeg: -12, radius: 2.2, focusY: -0.55, duration: 1.2 },
  Neck: { cameraDeg: 15, pitchDeg: 14, radius: 2.35, focusY: 0.35, duration: 1.2 },
  Cardio: { cameraDeg: 90, pitchDeg: 6, radius: 2.85, focusY: 0.05, duration: 1.2 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCameraDeg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return ((((n % 360) + 360) % 360) + 180) % 360 - 180;
}

function migrateLegacyPose(raw) {
  if (!raw) return null;
  if (raw.cameraDeg != null) return raw;
  return {
    cameraDeg: raw.angleDeg ?? 0,
    pitchDeg: 8,
    radius: raw.radius ?? 2.5,
    focusX: raw.targetX ?? 0,
    focusY: (raw.targetY ?? 1) - 1,
    focusZ: raw.targetZ ?? 0,
    duration: raw.duration ?? 1.2,
  };
}

function sanitizePose(rawPose, fallbackPose) {
  if (
    rawPose &&
    Array.isArray(rawPose.position) &&
    Array.isArray(rawPose.target) &&
    rawPose.position.length === 3 &&
    rawPose.target.length === 3
  ) {
    // Preserve exact lookAt values from Sketchfab capture.
    const duration = clamp(
      Number(rawPose.duration ?? fallbackPose?.duration ?? 1.2),
      0.5,
      2.5,
    );
    return {
      type: "lookAt",
      position: rawPose.position.map((v) => Number(v)),
      target: rawPose.target.map((v) => Number(v)),
      duration,
    };
  }

  const merged = migrateLegacyPose(rawPose) || {};
  const base = fallbackPose;

  return {
    cameraDeg: normalizeCameraDeg(merged.cameraDeg ?? base.cameraDeg),
    pitchDeg: clamp(Number(merged.pitchDeg ?? base.pitchDeg), -35, 35),
    radius: clamp(Number(merged.radius ?? base.radius), 1.5, 4.5),
    focusX: clamp(Number(merged.focusX ?? base.focusX ?? 0), -0.5, 0.5),
    focusY: clamp(Number(merged.focusY ?? base.focusY ?? 0), -1.2, 1.2),
    focusZ: clamp(Number(merged.focusZ ?? base.focusZ ?? 0), -0.5, 0.5),
    duration: clamp(Number(merged.duration ?? base.duration ?? 1.2), 0.5, 2.5),
  };
}

function buildCameraPosesFromRaw(saved) {
  const result = {};
  Object.keys(DEFAULT_CAMERA_POSES).forEach((muscle) => {
    result[muscle] = sanitizePose(saved?.[muscle], DEFAULT_CAMERA_POSES[muscle]);
  });
  return result;
}

function loadCameraPosesFromLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSE_STORAGE_KEY) || "{}");
    return buildCameraPosesFromRaw(saved);
  } catch {
    return buildCameraPosesFromRaw({});
  }
}

function serializeCameraPosesForStorage(poses) {
  const raw = {};
  Object.keys(DEFAULT_CAMERA_POSES).forEach((muscle) => {
    const pose = poses[muscle];
    if (!pose) return;
    if (
      pose.type === "lookAt" &&
      Array.isArray(pose.position) &&
      Array.isArray(pose.target)
    ) {
      raw[muscle] = {
        type: "lookAt",
        position: pose.position,
        target: pose.target,
        duration: pose.duration,
      };
      return;
    }
    raw[muscle] = {
      cameraDeg: pose.cameraDeg,
      pitchDeg: pose.pitchDeg,
      radius: pose.radius,
      focusX: pose.focusX,
      focusY: pose.focusY,
      focusZ: pose.focusZ,
      duration: pose.duration,
    };
  });
  return raw;
}

function posesDifferFromDefaults(poses) {
  return Object.keys(DEFAULT_CAMERA_POSES).some((muscle) => {
    const pose = poses[muscle];
    if (!pose) return false;
    if (pose.type === "lookAt") return true;
    const defaults = DEFAULT_CAMERA_POSES[muscle];
    return (
      pose.cameraDeg !== defaults.cameraDeg ||
      pose.pitchDeg !== defaults.pitchDeg ||
      pose.radius !== defaults.radius ||
      (pose.focusX ?? 0) !== (defaults.focusX ?? 0) ||
      (pose.focusY ?? 0) !== (defaults.focusY ?? 0) ||
      (pose.focusZ ?? 0) !== (defaults.focusZ ?? 0)
    );
  });
}

let cameraPosesHydrated = false;
let savePosesTimer = null;
let CAMERA_POSES = loadCameraPosesFromLocal();
const DESCRIPTIONS = {
  Chest: "Chest exercises improve pushing strength and upper body mass.",

  Back: "Back training improves posture, pulling power, and spinal support.",

  Shoulders: "Shoulder workouts improve stability and upper body aesthetics.",

  Biceps: "Biceps exercises build arm strength and pulling endurance.",

  Triceps: "Triceps training improves pressing power and arm size.",

  Legs: "Leg training builds strength, balance, and athletic performance.",

  Abs: "Core workouts improve stability and abdominal definition.",

  Forearms: "Forearm training improves grip strength and endurance.",

  Glutes: "Glute exercises improve lower body power and posture.",

  Calves: "Calf workouts improve explosive movement and balance.",

  Neck: "Neck training improves posture and neck stability.",

  Cardio: "Cardio exercises improve endurance and cardiovascular health.",
};
const DATA = {
  Chest: [
    {
      name: "Bench Press",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "Incline Dumbbell Press",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Push Ups",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Cable Fly",
      difficulty: "Medium",
      sets: "3 x 12",
    },
    {
      name: "Decline Press",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "Chest Dips",
      difficulty: "Hard",
      sets: "3 x 10",
    },
    {
      name: "Machine Press",
      difficulty: "Easy",
      sets: "3 x 12",
    },
    {
      name: "Pec Deck",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Landmine Press",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Resistance Push Up",
      difficulty: "Hard",
      sets: "4 x 12",
    },
  ],

  Back: [
    {
      name: "Deadlift",
      difficulty: "Hard",
      sets: "5 x 5",
    },
    {
      name: "Pull Ups",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Lat Pulldown",
      difficulty: "Easy",
      sets: "4 x 12",
    },
    {
      name: "Barbell Row",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Seated Row",
      difficulty: "Easy",
      sets: "3 x 12",
    },
    {
      name: "T-Bar Row",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Straight Arm Pulldown",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Rack Pull",
      difficulty: "Hard",
      sets: "4 x 6",
    },
    {
      name: "Reverse Grip Row",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Single Arm Row",
      difficulty: "Easy",
      sets: "3 x 12",
    },
  ],

  Shoulders: [
    {
      name: "Overhead Press",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "Arnold Press",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Lateral Raise",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Front Raise",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Shrugs",
      difficulty: "Easy",
      sets: "4 x 15",
    },
    {
      name: "Upright Row",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Push Press",
      difficulty: "Hard",
      sets: "5 x 5",
    },
    {
      name: "Cable Raise",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Face Pull",
      difficulty: "Medium",
      sets: "4 x 12",
    },
    {
      name: "Rear Delt Fly",
      difficulty: "Easy",
      sets: "3 x 15",
    },
  ],

  Biceps: [
    {
      name: "Barbell Curl",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Hammer Curl",
      difficulty: "Easy",
      sets: "3 x 12",
    },
    {
      name: "Spider Curl",
      difficulty: "Medium",
      sets: "3 x 12",
    },
    {
      name: "Preacher Curl",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Cable Curl",
      difficulty: "Easy",
      sets: "4 x 12",
    },
    {
      name: "EZ Bar Curl",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Concentration Curl",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Incline Curl",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Drag Curl",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "21s Curl",
      difficulty: "Hard",
      sets: "3 rounds",
    },
  ],

  Triceps: [
    {
      name: "Pushdown",
      difficulty: "Easy",
      sets: "4 x 12",
    },
    {
      name: "Skull Crushers",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Dips",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Overhead Extension",
      difficulty: "Easy",
      sets: "3 x 12",
    },
    {
      name: "Close Grip Bench",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "Kickbacks",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "JM Press",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "Cable Pushdown",
      difficulty: "Easy",
      sets: "4 x 12",
    },
    {
      name: "Bench Dips",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Diamond Push Ups",
      difficulty: "Medium",
      sets: "3 x 15",
    },
  ],

  Legs: [
    {
      name: "Squat",
      difficulty: "Hard",
      sets: "5 x 5",
    },
    {
      name: "Leg Press",
      difficulty: "Medium",
      sets: "4 x 12",
    },
    {
      name: "Lunges",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Romanian Deadlift",
      difficulty: "Hard",
      sets: "4 x 8",
    },
    {
      name: "Leg Extension",
      difficulty: "Easy",
      sets: "4 x 15",
    },
    {
      name: "Hack Squat",
      difficulty: "Medium",
      sets: "4 x 10",
    },
    {
      name: "Bulgarian Split Squat",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Step Ups",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Goblet Squat",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Front Squat",
      difficulty: "Hard",
      sets: "4 x 8",
    },
  ],

  Abs: [
    {
      name: "Crunches",
      difficulty: "Easy",
      sets: "3 x 20",
    },
    {
      name: "Leg Raises",
      difficulty: "Medium",
      sets: "4 x 15",
    },
    {
      name: "Plank",
      difficulty: "Medium",
      sets: "60 sec",
    },
    {
      name: "Russian Twist",
      difficulty: "Easy",
      sets: "3 x 20",
    },
    {
      name: "Cable Crunch",
      difficulty: "Medium",
      sets: "4 x 15",
    },
    {
      name: "Hanging Raises",
      difficulty: "Hard",
      sets: "4 x 12",
    },
    {
      name: "V-Ups",
      difficulty: "Hard",
      sets: "4 x 15",
    },
    {
      name: "Mountain Climbers",
      difficulty: "Easy",
      sets: "30 sec",
    },
    {
      name: "Toe Touches",
      difficulty: "Easy",
      sets: "3 x 20",
    },
    {
      name: "Dragon Flag",
      difficulty: "Hard",
      sets: "3 x 8",
    },
  ],

  Forearms: [
    {
      name: "Wrist Curl",
      difficulty: "Easy",
      sets: "4 x 15",
    },
    {
      name: "Reverse Curl",
      difficulty: "Medium",
      sets: "4 x 12",
    },
    {
      name: "Farmer Walk",
      difficulty: "Hard",
      sets: "60 sec",
    },
    {
      name: "Dead Hang",
      difficulty: "Hard",
      sets: "45 sec",
    },
    {
      name: "Plate Pinch",
      difficulty: "Medium",
      sets: "30 sec",
    },
    {
      name: "Hammer Rotation",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Towel Pull Up",
      difficulty: "Hard",
      sets: "3 x 10",
    },
    {
      name: "Grip Crush",
      difficulty: "Easy",
      sets: "4 x 20",
    },
    {
      name: "Finger Curl",
      difficulty: "Easy",
      sets: "4 x 15",
    },
    {
      name: "Behind Curl",
      difficulty: "Medium",
      sets: "4 x 10",
    },
  ],

  Glutes: [
    {
      name: "Hip Thrust",
      difficulty: "Medium",
      sets: "4 x 12",
    },
    {
      name: "Glute Bridge",
      difficulty: "Easy",
      sets: "4 x 15",
    },
    {
      name: "Cable Kickback",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Step Ups",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Bulgarian Split Squat",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Sumo Squat",
      difficulty: "Medium",
      sets: "4 x 12",
    },
    {
      name: "Walking Lunges",
      difficulty: "Medium",
      sets: "3 x 20",
    },
    {
      name: "Frog Pump",
      difficulty: "Easy",
      sets: "4 x 20",
    },
    {
      name: "Reverse Hyper",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Cable Pull Through",
      difficulty: "Medium",
      sets: "4 x 12",
    },
  ],

  Calves: [
    {
      name: "Standing Raise",
      difficulty: "Easy",
      sets: "4 x 20",
    },
    {
      name: "Seated Raise",
      difficulty: "Easy",
      sets: "4 x 20",
    },
    {
      name: "Donkey Raise",
      difficulty: "Medium",
      sets: "4 x 15",
    },
    {
      name: "Jump Rope",
      difficulty: "Easy",
      sets: "60 sec",
    },
    {
      name: "Box Jumps",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Farmer Walk",
      difficulty: "Medium",
      sets: "45 sec",
    },
    {
      name: "Single Leg Raise",
      difficulty: "Medium",
      sets: "4 x 15",
    },
    {
      name: "Sprint Push",
      difficulty: "Hard",
      sets: "30 sec",
    },
    {
      name: "Toe Walk",
      difficulty: "Easy",
      sets: "60 sec",
    },
    {
      name: "Explosive Jumps",
      difficulty: "Hard",
      sets: "4 x 12",
    },
  ],

  Neck: [
    {
      name: "Neck Flexion",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Neck Extension",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Lateral Flexion",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Resistance Holds",
      difficulty: "Medium",
      sets: "30 sec",
    },
    {
      name: "Neck Rotation",
      difficulty: "Easy",
      sets: "3 x 15",
    },
    {
      name: "Shrugs",
      difficulty: "Easy",
      sets: "4 x 15",
    },
    {
      name: "Weighted Flexion",
      difficulty: "Hard",
      sets: "4 x 10",
    },
    {
      name: "Bridge Hold",
      difficulty: "Hard",
      sets: "30 sec",
    },
    {
      name: "Band Pull",
      difficulty: "Medium",
      sets: "4 x 12",
    },
    {
      name: "Trap Raise",
      difficulty: "Medium",
      sets: "4 x 12",
    },
  ],

  Cardio: [
    {
      name: "Running",
      difficulty: "Medium",
      sets: "20 min",
    },
    {
      name: "Cycling",
      difficulty: "Easy",
      sets: "30 min",
    },
    {
      name: "Swimming",
      difficulty: "Hard",
      sets: "20 laps",
    },
    {
      name: "Jump Rope",
      difficulty: "Medium",
      sets: "10 min",
    },
    {
      name: "Burpees",
      difficulty: "Hard",
      sets: "4 x 20",
    },
    {
      name: "HIIT",
      difficulty: "Hard",
      sets: "15 min",
    },
    {
      name: "Rowing",
      difficulty: "Medium",
      sets: "20 min",
    },
    {
      name: "Sprints",
      difficulty: "Hard",
      sets: "10 rounds",
    },
    {
      name: "Stair Climber",
      difficulty: "Easy",
      sets: "20 min",
    },
    {
      name: "Battle Rope",
      difficulty: "Medium",
      sets: "45 sec",
    },
  ],
};

function favoritesStorageKey() {
  const email = window.MuscleMapAuth?.getSession?.()?.email;
  return email ? `musclemap_favorites_${email}` : "musclemap_favorites";
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(favoritesStorageKey())) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(favoritesStorageKey(), JSON.stringify(favorites));
  const email = window.MuscleMapAuth?.getSession?.()?.email;
  if (email && window.MuscleMapDB) {
    MuscleMapDB.init()
      .then(() => MuscleMapDB.saveFavorites(email, favorites))
      .catch(() => {});
  }
}

async function loadUserFavoritesFromDb() {
  const email = window.MuscleMapAuth?.getSession?.()?.email;
  if (!email || !window.MuscleMapDB) return;
  try {
    await MuscleMapDB.init();
    const items = await MuscleMapDB.getFavorites(email);
    if (items.length) {
      localStorage.setItem(favoritesStorageKey(), JSON.stringify(items));
    }
  } catch {
    /* use local cache */
  }
}

function favoriteId(muscle, name) {
  return `${muscle}::${name}`;
}

function isFavorite(muscle, name) {
  return getFavorites().includes(favoriteId(muscle, name));
}

function toggleFavorite(muscle, name) {
  const id = favoriteId(muscle, name);
  let favorites = getFavorites();
  if (favorites.includes(id)) {
    favorites = favorites.filter((item) => item !== id);
  } else {
    favorites.push(id);
  }
  saveFavorites(favorites);
  updateFavoritesPanel();
  updateStats();
}

const EQUIPMENT_HINTS = {
  Easy: "Bodyweight or light resistance",
  Medium: "Dumbbells, cables, or machines",
  Hard: "Barbell, heavy loads, or advanced skills",
};

const exerciseContainer = document.getElementById("exerciseContainer");
const anatomyLoader = document.getElementById("anatomyLoader");

const muscleTitle = document.getElementById("muscleTitle");

const exerciseCount = document.getElementById("exerciseCount");

let currentMuscle = "";

function setMuscleMenuOpen(open) {
  const select = document.getElementById("muscleSelect");
  const menu = document.getElementById("muscleSelectMenu");
  const trigger = document.getElementById("muscleSelectTrigger");
  if (!select || !menu || !trigger) return;

  select.classList.toggle("open", open);
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  menu.hidden = !open;
}

function updateMuscleDropdownUI(muscle) {
  const valueEl = document.getElementById("muscleSelectValue");
  if (valueEl) valueEl.textContent = muscle || "Choose a muscle";

  document.querySelectorAll(".muscle-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.muscle === muscle);
  });
}

function selectMuscle(muscle, { closeMenu = true } = {}) {
  if (!DATA[muscle]) return;

  currentMuscle = muscle;
  updateMuscleDropdownUI(muscle);

  const calibrationSelect = document.getElementById("calibrationMuscleSelect");
  if (calibrationSelect) calibrationSelect.value = muscle;

  if (closeMenu) setMuscleMenuOpen(false);
  renderExercises(muscle);
}

function initMuscleDropdown() {
  const menu = document.getElementById("muscleSelectMenu");
  const trigger = document.getElementById("muscleSelectTrigger");
  const select = document.getElementById("muscleSelect");
  if (!menu || !trigger || !select) return;

  menu.innerHTML = "";
  Object.keys(DATA).forEach((muscle) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "muscle-option";
    option.dataset.muscle = muscle;
    option.setAttribute("role", "option");
    option.innerHTML = `<span class="muscle-option-dot" aria-hidden="true"></span><span class="muscle-option-name">${escapeHtml(muscle)}</span>`;
    option.addEventListener("click", () => selectMuscle(muscle));
    menu.appendChild(option);
  });

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    setMuscleMenuOpen(!select.classList.contains("open"));
  });

  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) setMuscleMenuOpen(false);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMuscleMenuOpen(false);
  });
}

initMuscleDropdown();
let currentDifficulty = "All";

function setAnatomyLoadingState(loading) {
  anatomyLoader?.classList.toggle("visible", loading);
}

function getAllExercises() {
  return Object.entries(DATA).flatMap(([muscle, exercises]) =>
    exercises.map((exercise) => ({ muscle, ...exercise })),
  );
}

function saveCameraPoses() {
  if (!cameraPosesHydrated) return;

  const raw = serializeCameraPosesForStorage(CAMERA_POSES);
  localStorage.setItem(POSE_STORAGE_KEY, JSON.stringify(raw));

  clearTimeout(savePosesTimer);
  savePosesTimer = setTimeout(async () => {
    if (!window.MuscleMapAuth?.getSession?.()?.email || !window.MuscleMapDB) return;
    try {
      await MuscleMapDB.saveCameraPoses(raw);
    } catch {
      /* server save optional */
    }
  }, 500);
}

async function hydrateCameraPoses() {
  let poses = loadCameraPosesFromLocal();

  try {
    if (window.MuscleMapAuth) await MuscleMapAuth.ensureSession();
    const session = window.MuscleMapAuth?.getSession?.();
    if (session?.email && window.MuscleMapDB) {
      const serverRaw = await MuscleMapDB.getCameraPoses();
      const hasServerData =
        serverRaw && typeof serverRaw === "object" && Object.keys(serverRaw).length > 0;

      if (hasServerData) {
        poses = buildCameraPosesFromRaw(serverRaw);
        localStorage.setItem(
          POSE_STORAGE_KEY,
          JSON.stringify(serverRaw),
        );
      } else if (posesDifferFromDefaults(poses)) {
        await MuscleMapDB.saveCameraPoses(serializeCameraPosesForStorage(poses));
      }
    }
  } catch {
    /* keep local poses */
  }

  CAMERA_POSES = poses;
  cameraPosesHydrated = true;

  if (currentMuscle) {
    const muscle = currentMuscle;
    const safePose = sanitizePose(
      CAMERA_POSES[muscle],
      DEFAULT_CAMERA_POSES[muscle] || DEFAULT_CAMERA_POSES.Chest,
    );
    CAMERA_POSES[muscle] = safePose;
    if (typeof window.focusMuscleCamera === "function") {
      window.focusMuscleCamera(muscle, safePose);
    }
  }
}

function resetAllCameraPoses() {
  const fresh = {};
  Object.keys(DEFAULT_CAMERA_POSES).forEach((muscle) => {
    fresh[muscle] = sanitizePose({}, DEFAULT_CAMERA_POSES[muscle]);
  });
  CAMERA_POSES = fresh;
  saveCameraPoses();
}

function updateCalibrationLabel() {
  const label = document.getElementById("calibrationMuscleLabel");
  if (!label) return;
  label.textContent = currentMuscle ? `Current: ${currentMuscle}` : "Current: none";
}

function setCalibrationStatus(message) {
  const status = document.getElementById("calibrationStatus");
  if (!status) return;
  status.textContent = message;
}

function getCalibrationMuscle() {
  const select = document.getElementById("calibrationMuscleSelect");
  if (select?.value) return select.value;
  return currentMuscle || Object.keys(DATA)[0];
}

function renderExercises(muscle) {
  currentMuscle = muscle;
  updateMuscleDropdownUI(muscle);
  const calibrationSelect = document.getElementById("calibrationMuscleSelect");
  if (calibrationSelect) calibrationSelect.value = muscle;
  updateCalibrationLabel();
  setAnatomyLoadingState(true);

  muscleTitle.innerText = muscle;
  const safePose = sanitizePose(
    CAMERA_POSES[muscle],
    DEFAULT_CAMERA_POSES[muscle] || DEFAULT_CAMERA_POSES.Chest,
  );
  CAMERA_POSES[muscle] = safePose;
  if (typeof window.focusMuscleCamera === "function") {
    window.focusMuscleCamera(muscle, safePose);
  }
  setTimeout(() => setAnatomyLoadingState(false), 450);
  document.getElementById("muscleDescription").innerText = DESCRIPTIONS[muscle];

  let exercises = DATA[muscle] || [];

  const searchValue = document
    .getElementById("searchInput")
    .value.toLowerCase();

  if (currentDifficulty !== "All") {
    exercises = exercises.filter(
      (exercise) => exercise.difficulty === currentDifficulty,
    );
  }

  if (searchValue) {
    exercises = exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(searchValue),
    );
  }

  exerciseCount.innerText = `${exercises.length} exercise${exercises.length === 1 ? "" : "s"} found`;

  exerciseContainer.innerHTML = "";

  if (exercises.length === 0) {
    exerciseContainer.innerHTML =
      '<p class="empty-state">No exercises match your filters. Try another difficulty or search term.</p>';
    return;
  }

  exercises.forEach((exercise) => {
    const card = document.createElement("article");
    const starred = isFavorite(muscle, exercise.name);

    card.classList.add("exercise-card");
    card.innerHTML = `
      <div class="card-top">
        <h3>${escapeHtml(exercise.name)}</h3>
        <button type="button" class="fav-btn ${starred ? "active" : ""}" aria-label="Toggle favorite" data-muscle="${escapeHtml(muscle)}" data-name="${escapeHtml(exercise.name)}">★</button>
      </div>
      <span class="difficulty-badge ${exercise.difficulty.toLowerCase()}">${escapeHtml(exercise.difficulty)}</span>
      <p class="sets-line"><strong>Volume:</strong> ${escapeHtml(exercise.sets)}</p>
      <p class="equipment-line">${escapeHtml(EQUIPMENT_HINTS[exercise.difficulty])}</p>
      <button type="button" class="details-btn" data-muscle="${escapeHtml(muscle)}" data-name="${escapeHtml(exercise.name)}">View form tips</button>
    `;

    card.querySelector(".fav-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(muscle, exercise.name);
      renderExercises(muscle);
    });

    card.querySelector(".details-btn").addEventListener("click", () => {
      openExerciseModal(muscle, exercise);
    });

    exerciseContainer.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function openExerciseModal(muscle, exercise) {
  const modal = document.getElementById("exerciseModal");
  if (!modal) return;
  document.getElementById("modalTitle").textContent = exercise.name;
  document.getElementById("modalMuscle").textContent = muscle;
  document.getElementById("modalDifficulty").textContent = exercise.difficulty;
  document.getElementById("modalSets").textContent = exercise.sets;
  document.getElementById("modalEquipment").textContent =
    EQUIPMENT_HINTS[exercise.difficulty];
  document.getElementById("modalTip").textContent =
    exercise.tip ||
    `Focus on controlled reps for ${exercise.name}. Warm up the ${muscle.toLowerCase()} before heavy sets.`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeExerciseModal() {
  const modal = document.getElementById("exerciseModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function updateStats() {
  const totalExercises = Object.values(DATA).reduce(
    (sum, list) => sum + list.length,
    0,
  );
  document.getElementById("statMuscles").textContent = Object.keys(DATA).length;
  document.getElementById("statExercises").textContent = totalExercises;
  document.getElementById("statFavorites").textContent = getFavorites().length;
}

function updateFavoritesPanel() {
  const list = document.getElementById("favoritesList");
  const favorites = getFavorites();

  if (favorites.length === 0) {
    list.innerHTML =
      '<p class="empty-state">Star exercises to build your personal plan.</p>';
    return;
  }

  list.innerHTML = "";
  favorites.forEach((id) => {
    const [muscle, name] = id.split("::");
    const item = document.createElement("button");
    item.type = "button";
    item.className = "favorite-item";
    item.textContent = `${name} · ${muscle}`;
    item.addEventListener("click", () => {
      selectMuscle(muscle);
      const match = DATA[muscle]?.find((ex) => ex.name === name);
      if (match) openExerciseModal(muscle, match);
    });
    list.appendChild(item);
  });
}

function generateWorkout() {
  const muscles = Object.keys(DATA);
  const picks = [];
  while (picks.length < 5) {
    const muscle = muscles[Math.floor(Math.random() * muscles.length)];
    const pool = DATA[muscle];
    const exercise = pool[Math.floor(Math.random() * pool.length)];
    const key = favoriteId(muscle, exercise.name);
    if (!picks.some((p) => favoriteId(p.muscle, p.exercise.name) === key)) {
      picks.push({ muscle, exercise });
    }
  }

  const box = document.getElementById("workoutPlan");
  box.innerHTML = picks
    .map(
      (p, i) =>
        `<div class="plan-row"><span>${i + 1}</span><strong>${escapeHtml(p.exercise.name)}</strong><em>${escapeHtml(p.muscle)}</em><small>${escapeHtml(p.exercise.sets)}</small></div>`,
    )
    .join("");
  document.getElementById("workoutPanel")?.classList.add("open");

  // Also render generated items in the main list so user sees exercises instantly.
  exerciseContainer.innerHTML = "";
  muscleTitle.innerText = "Generated Workout";
  exerciseCount.innerText = `${picks.length} exercises generated`;
  document.getElementById("muscleDescription").innerText =
    "Auto-generated balanced plan. Regenerate anytime for a different routine.";

  picks.forEach((pick) => {
    const card = document.createElement("article");
    card.classList.add("exercise-card");
    card.innerHTML = `
      <div class="card-top">
        <h3>${escapeHtml(pick.exercise.name)}</h3>
        <span class="difficulty-badge ${pick.exercise.difficulty.toLowerCase()}">${escapeHtml(pick.exercise.difficulty)}</span>
      </div>
      <p class="sets-line"><strong>Muscle:</strong> ${escapeHtml(pick.muscle)}</p>
      <p class="sets-line"><strong>Volume:</strong> ${escapeHtml(pick.exercise.sets)}</p>
      <button type="button" class="details-btn">View form tips</button>
    `;
    card.querySelector(".details-btn").addEventListener("click", () => {
      openExerciseModal(pick.muscle, pick.exercise);
    });
    exerciseContainer.appendChild(card);
  });
}

function initFreeExerciseZone() {
  const muscleSelect = document.getElementById("freeMuscleSelect");
  const levelSelect = document.getElementById("freeDifficultySelect");
  const button = document.getElementById("showFreeExercisesBtn");
  const list = document.getElementById("freeExerciseList");
  if (!muscleSelect || !levelSelect || !button || !list) return;

  Object.keys(DATA).forEach((muscle) => {
    const option = document.createElement("option");
    option.value = muscle;
    option.textContent = muscle;
    muscleSelect.appendChild(option);
  });

  function renderFreeList() {
    const selectedMuscle = muscleSelect.value;
    const selectedLevel = levelSelect.value;
    let items = getAllExercises();

    if (selectedMuscle !== "All") {
      items = items.filter((item) => item.muscle === selectedMuscle);
    }
    if (selectedLevel !== "All") {
      items = items.filter((item) => item.difficulty === selectedLevel);
    }

    if (items.length === 0) {
      list.innerHTML =
        '<p class="empty-state">No exercises found for this free mode filter.</p>';
      return;
    }

    list.innerHTML = items
      .slice(0, 20)
      .map(
        (item) =>
          `<div class="free-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.muscle)} · ${escapeHtml(item.sets)}</span></div>`,
      )
      .join("");
  }

  button.addEventListener("click", renderFreeList);
  renderFreeList();
}

function initCalibrationTools() {
  const bind = (id, handler) =>
    document.getElementById(id)?.addEventListener("click", handler);

  const calibrationSelect = document.getElementById("calibrationMuscleSelect");
  if (calibrationSelect) {
    calibrationSelect.innerHTML = Object.keys(DATA)
      .map((muscle) => `<option value="${muscle}">${muscle}</option>`)
      .join("");
    calibrationSelect.value = Object.keys(DATA)[0];
    calibrationSelect.addEventListener("change", () => {
      const muscle = calibrationSelect.value;
      currentMuscle = muscle;
      updateCalibrationLabel();
      setCalibrationStatus(`Editing ${muscle}`);
      applyMuscleCamera(muscle);
    });
  }

  function applyMuscleCamera(muscle) {
    const pose = sanitizePose(
      CAMERA_POSES[muscle],
      DEFAULT_CAMERA_POSES[muscle] || DEFAULT_CAMERA_POSES.Chest,
    );
    CAMERA_POSES[muscle] = pose;
    if (typeof window.focusMuscleCamera === "function") {
      window.focusMuscleCamera(muscle, pose);
    }
  }

  const adjustCurrentPose = (patch) => {
    const muscle = getCalibrationMuscle();
    const current = CAMERA_POSES[muscle] || DEFAULT_CAMERA_POSES.Chest;
    CAMERA_POSES[muscle] = sanitizePose(
      { ...current, ...patch },
      DEFAULT_CAMERA_POSES[muscle] || DEFAULT_CAMERA_POSES.Chest,
    );
    currentMuscle = muscle;
    updateCalibrationLabel();
    applyMuscleCamera(muscle);
    saveCameraPoses();
    setCalibrationStatus(`Saved ${muscle}`);
  };

  bind("angleMinus", () =>
    adjustCurrentPose({
      cameraDeg:
        (CAMERA_POSES[getCalibrationMuscle()]?.cameraDeg || 0) - 5,
    }),
  );
  bind("anglePlus", () =>
    adjustCurrentPose({
      cameraDeg:
        (CAMERA_POSES[getCalibrationMuscle()]?.cameraDeg || 0) + 5,
    }),
  );
  bind("heightMinus", () =>
    adjustCurrentPose({
      pitchDeg:
        Number(CAMERA_POSES[getCalibrationMuscle()]?.pitchDeg || 0) - 3,
    }),
  );
  bind("heightPlus", () =>
    adjustCurrentPose({
      pitchDeg:
        Number(CAMERA_POSES[getCalibrationMuscle()]?.pitchDeg || 0) + 3,
    }),
  );
  bind("zoomMinus", () =>
    adjustCurrentPose({
      radius: Number((CAMERA_POSES[getCalibrationMuscle()]?.radius || 2.5) - 0.1),
    }),
  );
  bind("zoomPlus", () =>
    adjustCurrentPose({
      radius: Number((CAMERA_POSES[getCalibrationMuscle()]?.radius || 2.5) + 0.1),
    }),
  );
  bind("targetUp", () =>
    adjustCurrentPose({
      focusY: Number((CAMERA_POSES[getCalibrationMuscle()]?.focusY || 0) + 0.05),
    }),
  );
  bind("targetDown", () =>
    adjustCurrentPose({
      focusY: Number((CAMERA_POSES[getCalibrationMuscle()]?.focusY || 0) - 0.05),
    }),
  );

  bind("savePoseBtn", () => {
    const muscle = getCalibrationMuscle();
    saveCameraPoses();
    setCalibrationStatus(`Saved ${muscle}`);
  });

  bind("resetPoseBtn", () => {
    const muscle = getCalibrationMuscle();
    CAMERA_POSES[muscle] = sanitizePose({}, DEFAULT_CAMERA_POSES[muscle]);
    applyMuscleCamera(muscle);
    saveCameraPoses();
    setCalibrationStatus(`Reset ${muscle}`);
  });

  bind("resetAllPosesBtn", () => {
    resetAllCameraPoses();
    const muscle = getCalibrationMuscle();
    applyMuscleCamera(muscle);
    setCalibrationStatus("Reset all poses");
  });

  bind("capturePoseBtn", () => {
    const muscle = getCalibrationMuscle();
    if (typeof window.captureCurrentCameraPose !== "function") return;

    window.captureCurrentCameraPose((pose) => {
      CAMERA_POSES[muscle] = sanitizePose(pose, DEFAULT_CAMERA_POSES[muscle]);
      saveCameraPoses();
      setCalibrationStatus(`Captured & saved ${muscle}`);
    });
  });
}
document.getElementById("searchInput").addEventListener("input", () => {
  if (currentMuscle) {
    renderExercises(currentMuscle);
  }
});

document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    currentDifficulty = button.dataset.level;

    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));

    button.classList.add("active");

    if (currentMuscle) {
      renderExercises(currentMuscle);
    }
  });
});

// ----------------------------
// Initial UI state + handlers
// ----------------------------
document.getElementById("searchInput").dispatchEvent(new Event("input"));

// Default stats + favorites
updateStats();
updateFavoritesPanel();

// Workout generator
document
  .getElementById("generateWorkoutBtn")
  ?.addEventListener("click", generateWorkout);

// Modal close handling
const exerciseModal = document.getElementById("exerciseModal");
document
  .getElementById("modalCloseBtn")
  ?.addEventListener("click", closeExerciseModal);

exerciseModal?.addEventListener("click", (e) => {
  if (e.target === exerciseModal) closeExerciseModal();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeExerciseModal();
});

window.addEventListener("musclemap:viewerready", () => {
  setAnatomyLoadingState(false);
  localStorage.removeItem("musclemap_camera_poses_v1");
  if (currentMuscle && typeof window.focusMuscleCamera === "function") {
    const pose = sanitizePose(
      CAMERA_POSES[currentMuscle],
      DEFAULT_CAMERA_POSES[currentMuscle] || DEFAULT_CAMERA_POSES.Chest,
    );
    window.focusMuscleCamera(currentMuscle, pose);
  }
});

// Fallback in case viewerready is delayed.
setTimeout(() => setAnatomyLoadingState(false), 3000);

(async function initMuscleMapApp() {
  await hydrateCameraPoses();

  loadUserFavoritesFromDb().then(() => {
    updateStats();
    updateFavoritesPanel();
  });

  initFreeExerciseZone();
  initCalibrationTools();
  updateCalibrationLabel();
})();
