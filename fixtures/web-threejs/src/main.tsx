import { createRoot } from "react-dom/client";
import * as THREE from "three";

const PROBLEMS = ["none", "drawcalls", "longtask", "alloc"] as const;
type Problem = (typeof PROBLEMS)[number];

function parseProblem(): Problem {
  const param = new URLSearchParams(window.location.search).get("problem");
  return PROBLEMS.includes(param as Problem) ? (param as Problem) : "none";
}

function App(): null {
  return null;
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("missing #root");
}

const problem = parseProblem();
const overlay = document.createElement("div");
overlay.style.cssText =
  "position:absolute;top:8px;left:8px;color:#fff;font:12px monospace;background:#000a;padding:4px 8px;";
overlay.textContent = `problem: ${problem}`;
rootElement.appendChild(overlay);

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

// Draw-call problem: many small meshes
const extraMeshes: THREE.Mesh[] = [];
if (problem === "drawcalls") {
  for (let i = 0; i < 200; i++) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(
      Math.random() * 4 - 2,
      Math.random() * 4 - 2,
      Math.random() * 4 - 2,
    );
    scene.add(m);
    extraMeshes.push(m);
  }
}

// Long-task problem: busy loop every frame
let longTaskCounter = 0;
function longTask(): void {
  const end = performance.now() + 50; // 50 ms busy block
  while (performance.now() < end) {
    longTaskCounter += Math.sqrt(longTaskCounter + 1);
  }
}

// Allocation problem: allocate and discard every frame
function allocFrame(): void {
  Array.from({ length: 100_000 }, (_, i) => i * 2);
}

function render(): void {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  if (problem === "longtask") {
    longTask();
  }
  if (problem === "alloc") {
    allocFrame();
  }
  for (const m of extraMeshes) {
    m.rotation.x += 0.01;
    m.rotation.y += 0.01;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

createRoot(rootElement).render(<App />);
