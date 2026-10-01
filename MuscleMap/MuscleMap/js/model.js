const iframe = document.getElementById("api-frame");
const uid = "9bfa112a99844626ac2480fff6276f0e";

const client = new Sketchfab("1.12.1", iframe);

let api = null;
let viewerReady = false;
let pendingMuscle = null;
let modelCenter = [0, 1, 0];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(value) {
  return (Number(value) * Math.PI) / 180;
}

client.init(uid, {
  success(apiInstance) {
    api = apiInstance;
    api.start();

    api.addEventListener("viewerready", () => {
      api.getCameraLookAt((err, camera) => {
        if (!err && camera?.target?.length === 3) {
          modelCenter = [...camera.target];
        }

        viewerReady = true;
        window.dispatchEvent(new Event("musclemap:viewerready"));

        if (pendingMuscle) {
          window.focusMuscleCamera(pendingMuscle);
          pendingMuscle = null;
        }
      });
    });
  },

  error() {
    console.error("Sketchfab API Error");
  },

  autostart: 1,
  ui_infos: 0,
  ui_controls: 1,
  ui_watermark: 0,
});

/**
 * Move camera using orbit yaw/pitch around the model center.
 * cameraDeg matches Sketchfab embed ?camera= values (0 = front, 180 = back).
 */
window.focusMuscleCamera = function (muscle, pose) {
  if (!muscle) return;

  if (!api || !viewerReady) {
    pendingMuscle = muscle;
    return;
  }

  const p = pose || {};

  // If we have exact camera lookAt values, apply them directly.
  if (
    Array.isArray(p.position) &&
    Array.isArray(p.target) &&
    p.position.length === 3 &&
    p.target.length === 3
  ) {
    const duration = clamp(Number(p.duration ?? 1.2), 0.5, 2.5);
    api.setCameraLookAt(p.position, p.target, duration);
    return;
  }
  const cameraDeg = Number(p.cameraDeg ?? 0);
  const pitchDeg = clamp(Number(p.pitchDeg ?? 8), -35, 35);
  const radius = clamp(Number(p.radius ?? 2.5), 1.5, 4.5);
  const focusX = clamp(Number(p.focusX ?? 0), -0.5, 0.5);
  const focusY = clamp(Number(p.focusY ?? 0), -1.2, 1.2);
  const focusZ = clamp(Number(p.focusZ ?? 0), -0.5, 0.5);
  const duration = clamp(Number(p.duration ?? 1.2), 0.5, 2.5);

  const target = [
    modelCenter[0] + focusX,
    modelCenter[1] + focusY,
    modelCenter[2] + focusZ,
  ];

  const yaw = degToRad(cameraDeg);
  const pitch = degToRad(pitchDeg);
  const horizontal = radius * Math.cos(pitch);

  const position = [
    target[0] + horizontal * Math.sin(yaw),
    target[1] + radius * Math.sin(pitch),
    target[2] + horizontal * Math.cos(yaw),
  ];

  api.setCameraLookAt(position, target, duration);
};

/** Read live camera and convert to savable pose for the calibration tool. */
window.captureCurrentCameraPose = function (callback) {
  if (!api || !viewerReady) return;

  api.getCameraLookAt((err, camera) => {
    if (err || !camera?.position || !camera?.target) return;

    const dx = camera.position[0] - camera.target[0];
    const dy = camera.position[1] - camera.target[1];
    const dz = camera.position[2] - camera.target[2];
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz) || 2.5;
    const pitchDeg = (Math.asin(clamp(dy / radius, -1, 1)) * 180) / Math.PI;
    let cameraDeg = (Math.atan2(dx, dz) * 180) / Math.PI;

    const pose = {
      type: "lookAt",
      // Save exact values returned by Sketchfab so replay is deterministic.
      position: [...camera.position],
      target: [...camera.target],

      // Also store orbit parameters for debugging/calibration.
      cameraDeg: Math.round(cameraDeg),
      pitchDeg: Math.round(pitchDeg),
      radius: Number(radius.toFixed(2)),
      focusX: Number((camera.target[0] - modelCenter[0]).toFixed(2)),
      focusY: Number((camera.target[1] - modelCenter[1]).toFixed(2)),
      focusZ: Number((camera.target[2] - modelCenter[2]).toFixed(2)),
      duration: 1.2,
    };

    callback?.(pose);
  });
};

// Backward compatibility
window.focusModelPose = function (pose) {
  window.focusMuscleCamera("Custom", {
    cameraDeg: pose?.cameraDeg ?? pose?.angleDeg ?? 0,
    pitchDeg: pose?.pitchDeg ?? 8,
    radius: pose?.radius ?? 2.5,
    focusX: pose?.focusX ?? pose?.targetX ?? 0,
    focusY: pose?.focusY ?? 0,
    focusZ: pose?.focusZ ?? pose?.targetZ ?? 0,
    duration: pose?.duration ?? 1.2,
  });
};
