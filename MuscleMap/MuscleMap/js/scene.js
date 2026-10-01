import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const viewport = document.getElementById("viewport");

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(
  75,
  viewport.clientWidth / viewport.clientHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.setSize(viewport.clientWidth, viewport.clientHeight);

viewport.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();

const material = new THREE.MeshStandardMaterial({
  color: 0xff3c3c,
});

const cube = new THREE.Mesh(geometry, material);

scene.add(cube);

const light = new THREE.DirectionalLight(0xffffff, 2);

light.position.set(2, 2, 3);

scene.add(light);

camera.position.z = 3;

function animate() {
  requestAnimationFrame(animate);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
});
