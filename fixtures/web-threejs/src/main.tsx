import { createRoot } from "react-dom/client";
import * as THREE from "three";

function App(): null {
  return null;
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("missing #root");
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(320, 240);
rootElement.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 2;

function render(): void {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

createRoot(rootElement).render(<App />);
