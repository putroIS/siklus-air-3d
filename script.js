import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const sceneRoot = document.getElementById("scene");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");

let scene, camera, renderer, controls, clock;
let clouds = [], vaporParticles = [], rainParticles = [], river, sun;
let currentStage = 0;
let isPlaying = true;
let elapsed = 0;
let audioEngine = null;
let audioEnabled = false;

const stages = [
  {
    title: "1. Evaporasi",
    description: "Panas matahari mengubah air di laut dan permukaan bumi menjadi uap air yang naik ke atmosfer.",
    sound: "evaporation"
  },
  {
    title: "2. Transpirasi",
    description: "Tumbuhan melepaskan uap air dari daun ke udara. Proses ini ikut menambah kelembapan atmosfer.",
    sound: "forest"
  },
  {
    title: "3. Kondensasi",
    description: "Uap air naik, mendingin, lalu berkumpul menjadi titik-titik air kecil yang membentuk awan.",
    sound: "wind"
  },
  {
    title: "4. Presipitasi",
    description: "Ketika titik-titik air di awan semakin besar dan berat, air jatuh ke permukaan bumi sebagai hujan.",
    sound: "rain"
  },
  {
    title: "5. Infiltrasi & Runoff",
    description: "Sebagian air meresap ke tanah, sementara sebagian lainnya mengalir melalui permukaan menuju sungai.",
    sound: "stream"
  },
  {
    title: "6. Pengumpulan",
    description: "Air terkumpul kembali di sungai, danau, dan laut. Siklus kemudian berlangsung kembali.",
    sound: "ocean"
  }
];

function makeMaterial(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function addCloud(x, y, z, scale = 1) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xeaf5fa, roughness: 1 });
  const parts = [
    [0, 0, 0, 1.0], [0.8, 0.12, 0, 0.75], [-0.75, 0.05, 0.02, 0.7],
    [0.2, 0.48, 0, 0.72], [-0.35, 0.38, 0, 0.7]
  ];
  parts.forEach(([px, py, pz, s]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.62 * s, 16, 12), material);
    mesh.position.set(px, py, pz);
    group.add(mesh);
  });
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  scene.add(group);
  clouds.push({ group, startX: x, speed: 0.12 + Math.random() * 0.08 });
}

function createParticleField(count, color, size, area, targetArray) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * area.x;
    positions[i * 3 + 1] = Math.random() * area.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
    velocities.push(0.25 + Math.random() * 0.55);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  targetArray.push({ points, velocities, area });
  return points;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc8df);
  scene.fog = new THREE.Fog(0x8fc8df, 18, 48);
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(12, 10, 18);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  sceneRoot.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 2, 0);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 8;
  controls.maxDistance = 34;

  scene.add(new THREE.HemisphereLight(0xe6f8ff, 0x526b42, 2.0));
  const sunlight = new THREE.DirectionalLight(0xfff0c4, 2.4);
  sunlight.position.set(-8, 14, 8);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  scene.add(sunlight);

  // Daratan dan perbukitan
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), makeMaterial(0x477c50));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.1, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const hillMat = makeMaterial(0x548b59);
  [[-7, 1.1, -3, 4.8], [-3.8, 1.6, -5, 5.3], [1, 1.2, -6, 4.5]].forEach(([x, y, z, r]) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), hillMat);
    hill.scale.y = 0.48;
    hill.position.set(x, y, z);
    hill.castShadow = true;
    hill.receiveShadow = true;
    scene.add(hill);
  });

  // Gunung di latar
  const mountainMat = makeMaterial(0x718c99);
  const snowMat = makeMaterial(0xe5f2f4);
  [-9, -5.8, -2.8].forEach((x, i) => {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(3.1 - i * 0.25, 7 + (i % 2), 5), mountainMat);
    mountain.position.set(x, 3.2, -8.5);
    mountain.castShadow = true;
    scene.add(mountain);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.0, 5), snowMat);
    snow.position.set(x, 6.1 + (i % 2) * 0.5, -8.5);
    scene.add(snow);
  });

  // Laut di sisi kanan
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(19, 13), new THREE.MeshStandardMaterial({
    color: 0x168db6, roughness: 0.28, metalness: 0.12
  }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(9, 0.02, 1.5);
  scene.add(ocean);

  // Sungai berkelok sederhana
  const riverPoints = [
    new THREE.Vector3(-7, 0.035, -4), new THREE.Vector3(-4, 0.04, -1),
    new THREE.Vector3(-1, 0.04, 0.5), new THREE.Vector3(2, 0.04, 1.2),
    new THREE.Vector3(5, 0.04, 1.8)
  ];
  const curve = new THREE.CatmullRomCurve3(riverPoints);
  river = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.42, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x3bb9d2, roughness: 0.22, metalness: 0.15 }));
  scene.add(river);

  // Matahari
  sun = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd66e }));
  sun.position.set(-10, 10, -4);
  scene.add(sun);
  const sunGlow = new THREE.PointLight(0xffd27a, 30, 22);
  sunGlow.position.copy(sun.position);
  scene.add(sunGlow);

  // Pohon
  for (let i = 0; i < 16; i++) {
    const x = -10 + Math.random() * 10;
    const z = -1 + Math.random() * 7;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.3, 7), makeMaterial(0x68452c));
    trunk.position.set(x, 0.65, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.85 + Math.random() * 0.35, 12, 10), makeMaterial(0x286b42));
    crown.position.set(x, 1.65, z);
    crown.castShadow = true;
    scene.add(crown);
  }

  addCloud(-3, 8, -3, 1.2);
  addCloud(3, 9, -5, 1.0);
  addCloud(8, 8, -2, 1.25);
  createParticleField(260, 0xc5f8ff, 0.09, { x: 9, y: 6, z: 7 }, vaporParticles);
  createParticleField(520, 0xd9f4ff, 0.075, { x: 12, y: 8, z: 10 }, rainParticles);
}

function updateStageUI() {
  const stage = stages[currentStage];
  document.getElementById("stageTitle").textContent = stage.title;
  document.getElementById("stageDescription").textContent = stage.description;
  document.getElementById("stageNumber").textContent = `${String(currentStage + 1).padStart(2, "0")} / 06`;
  document.getElementById("progressBar").style.width = `${((currentStage + 1) / stages.length) * 100}%`;
  if (audioEngine && audioEnabled) audioEngine.setScene(stage.sound);
}

function setStage(index) {
  currentStage = (index + stages.length) % stages.length;
  updateStageUI();
  updateStageVisuals();
}


// Visual khusus tiap tahapan agar perubahan siklus terlihat jelas.
let stageVisualGroups = [];
let stageVapor = [];
let stageRain = [];
let stageInfiltration = [];
let stageRunoff = [];
let stageRipples = [];
let stageCloudHighlights = [];

function makeParticleGroup(count, color, size, positions, materialOpacity = 0.9) {
  const geometry = new THREE.BufferGeometry();
  const coords = new Float32Array(count * 3);
  const speeds = [];
  for (let i = 0; i < count; i++) {
    const p = positions(i);
    coords[i * 3] = p.x;
    coords[i * 3 + 1] = p.y;
    coords[i * 3 + 2] = p.z;
    speeds.push(p.speed || (0.35 + Math.random() * 0.45));
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(coords, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color, size, transparent: true, opacity: materialOpacity, depthWrite: false
  }));
  scene.add(points);
  return { points, speeds, initial: coords.slice() };
}

function setupStageVisuals() {
  // 1. Evaporasi: kolom uap muncul tepat dari permukaan laut.
  const evaporation = makeParticleGroup(95, 0xc8f6ff, 0.13, () => ({
    x: 3.0 + Math.random() * 11,
    y: 0.25 + Math.random() * 4.4,
    z: -3.2 + Math.random() * 8,
    speed: 0.45 + Math.random() * 0.6
  }));
  stageVapor.push({ ...evaporation, type: "up" });
  stageVisualGroups.push(evaporation.points);

  // 2. Transpirasi: uap kecil yang berasal dari area pepohonan.
  const transpiration = makeParticleGroup(75, 0xd7ffe2, 0.11, () => ({
    x: -9 + Math.random() * 7,
    y: 0.5 + Math.random() * 3.5,
    z: -1 + Math.random() * 6,
    speed: 0.35 + Math.random() * 0.55
  }));
  stageVapor.push({ ...transpiration, type: "up" });
  stageVisualGroups.push(transpiration.points);

  // 3. Kondensasi: lingkaran cahaya lembut di sekitar awan.
  clouds.forEach((cloud, i) => {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.65, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.12, wireframe: true })
    );
    halo.position.copy(cloud.group.position);
    halo.scale.set(1.55, 0.62, 0.8);
    scene.add(halo);
    stageCloudHighlights.push({ mesh: halo, cloud: cloud.group, phase: i });
  });

  // 4. Presipitasi: garis-garis hujan jatuh dari awan menuju daratan.
  const rainGeometry = new THREE.BufferGeometry();
  const rainCount = 340;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = -1 + Math.random() * 13;
    rainPositions[i * 3 + 1] = 2.5 + Math.random() * 7;
    rainPositions[i * 3 + 2] = -5 + Math.random() * 10;
  }
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rainLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xd9f7ff, transparent: true, opacity: 0.7 })
  );
  const lineCoords = [];
  for (let i = 0; i < rainCount; i++) {
    const x = rainPositions[i * 3], y = rainPositions[i * 3 + 1], z = rainPositions[i * 3 + 2];
    lineCoords.push(x, y, z, x - 0.035, y - 0.34, z);
  }
  rainLines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(lineCoords, 3));
  scene.add(rainLines);
  stageRain.push({ lines: rainLines, positions: rainPositions, count: rainCount });
  stageVisualGroups.push(rainLines);

  // 5. Infiltrasi: potongan lapisan tanah dengan titik air yang turun ke bawah.
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.7, 3.6),
    new THREE.MeshStandardMaterial({ color: 0x79543a, transparent: true, opacity: 0.82 })
  );
  soil.position.set(-2.0, -0.95, 3.1);
  scene.add(soil);
  stageVisualGroups.push(soil);

  const undergroundWater = new THREE.Mesh(
    new THREE.BoxGeometry(5.05, 0.25, 3.45),
    new THREE.MeshStandardMaterial({ color: 0x168dbb, transparent: true, opacity: 0.75 })
  );
  undergroundWater.position.set(-2.0, -1.65, 3.1);
  scene.add(undergroundWater);
  stageVisualGroups.push(undergroundWater);

  const infiltration = makeParticleGroup(70, 0x8deaff, 0.12, () => ({
    x: -4.5 + Math.random() * 5,
    y: -0.05 - Math.random() * 1.45,
    z: 1.4 + Math.random() * 3.4,
    speed: 0.35 + Math.random() * 0.5
  }));
  stageInfiltration.push(infiltration);
  stageVisualGroups.push(infiltration.points);

  // Aliran permukaan menuju sungai/laut.
  const runoff = makeParticleGroup(85, 0x9beeff, 0.105, () => ({
    x: -7 + Math.random() * 12,
    y: 0.12 + Math.random() * 0.1,
    z: -2 + Math.random() * 4,
    speed: 0.6 + Math.random() * 0.6
  }));
  stageRunoff.push(runoff);
  stageVisualGroups.push(runoff.points);

  // 6. Pengumpulan: riak melingkar di permukaan laut.
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.34, 40),
      new THREE.MeshBasicMaterial({ color: 0xb8f4ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(5 + i * 1.9, 0.08, -2 + (i % 3) * 2.2);
    scene.add(ring);
    stageRipples.push({ mesh: ring, phase: i * 0.8 });
  }

  updateStageVisuals();
}

function updateStageVisuals() {
  const show = (obj, yes) => { if (obj) obj.visible = yes; };
  // Existing generic particles are hidden so each phase has its own visual.
  vaporParticles.forEach(v => show(v.points, false));
  rainParticles.forEach(v => show(v.points, false));

  stageVapor.forEach((v, i) => show(v.points, currentStage === (i === 0 ? 0 : 1)));
  stageCloudHighlights.forEach(h => show(h.mesh, currentStage === 2));
  stageRain.forEach(r => show(r.lines, currentStage === 3));

  // Index visual groups: soil, underground water, infiltration and runoff.
  const soilIndex = stageVisualGroups[stageVisualGroups.length - 4];
  const waterIndex = stageVisualGroups[stageVisualGroups.length - 3];
  const infiltrationIndex = stageVisualGroups[stageVisualGroups.length - 2];
  const runoffIndex = stageVisualGroups[stageVisualGroups.length - 1];
  show(soilIndex, currentStage === 4);
  show(waterIndex, currentStage === 4);
  show(infiltrationIndex, currentStage === 4);
  show(runoffIndex, currentStage === 4);
  stageRipples.forEach(r => show(r.mesh, currentStage === 5));
}

function updateStageVisualMotion(delta) {
  if (!isPlaying) return;
  stageVapor.forEach(v => {
    if (!v.points.visible) return;
    const attr = v.points.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < v.speeds.length; i++) {
      arr[i * 3 + 1] += delta * v.speeds[i];
      if (arr[i * 3 + 1] > 8.5) arr[i * 3 + 1] = 0.25;
    }
    attr.needsUpdate = true;
  });

  stageRain.forEach(r => {
    if (!r.lines.visible) return;
    const pos = r.lines.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < r.count; i++) {
      arr[i * 6 + 1] -= delta * 5.5;
      arr[i * 6 + 4] = arr[i * 6 + 1] - 0.34;
      if (arr[i * 6 + 1] < 0.15) {
        arr[i * 6 + 1] = 8 + Math.random() * 2;
        arr[i * 6 + 4] = arr[i * 6 + 1] - 0.34;
      }
    }
    pos.needsUpdate = true;
  });

  stageInfiltration.forEach(v => {
    if (!v.points.visible) return;
    const attr = v.points.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < v.speeds.length; i++) {
      arr[i * 3 + 1] -= delta * v.speeds[i] * 0.45;
      if (arr[i * 3 + 1] < -1.65) arr[i * 3 + 1] = -0.08;
    }
    attr.needsUpdate = true;
  });

  stageRunoff.forEach(v => {
    if (!v.points.visible) return;
    const attr = v.points.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < v.speeds.length; i++) {
      arr[i * 3] += delta * v.speeds[i];
      if (arr[i * 3] > 5.5) arr[i * 3] = -7;
    }
    attr.needsUpdate = true;
  });

  stageRipples.forEach(r => {
    if (!r.mesh.visible) return;
    const scale = 0.7 + ((Math.sin(elapsed * 1.6 + r.phase) + 1) * 0.5) * 1.25;
    r.mesh.scale.setScalar(scale);
    r.mesh.material.opacity = 0.65 - (scale - 0.7) * 0.25;
  });

  stageCloudHighlights.forEach(h => {
    if (h.mesh.visible) {
      h.mesh.position.copy(h.cloud.position);
      const pulse = 1 + Math.sin(elapsed * 1.8 + h.phase) * 0.06;
      h.mesh.scale.set(1.55 * pulse, 0.62 * pulse, 0.8 * pulse);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (isPlaying) elapsed += delta;

  clouds.forEach(({ group, speed, startX }, i) => {
    if (isPlaying) group.position.x += Math.sin(elapsed * speed + i) * delta * 0.12;
    if (group.position.x > 15) group.position.x = -15;
  });

  vaporParticles.forEach(({ points, velocities, area }) => {
    const p = points.geometry.attributes.position.array;
    for (let i = 0; i < velocities.length; i++) {
      if (isPlaying) p[i * 3 + 1] += delta * velocities[i] * (currentStage < 3 ? 1.1 : 0.45);
      if (p[i * 3 + 1] > area.y) p[i * 3 + 1] = 0;
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.visible = currentStage <= 2;
  });

  rainParticles.forEach(({ points, velocities, area }) => {
    const p = points.geometry.attributes.position.array;
    for (let i = 0; i < velocities.length; i++) {
      if (isPlaying && currentStage === 3) p[i * 3 + 1] -= delta * velocities[i] * 3.4;
      else if (isPlaying) p[i * 3 + 1] -= delta * velocities[i] * 0.25;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] = area.y * (0.45 + Math.random() * 0.55);
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.visible = currentStage === 3 || currentStage === 4;
  });

  if (sun && isPlaying) sun.position.y = 10 + Math.sin(elapsed * 0.25) * 0.18;
  updateStageVisualMotion(delta);
  controls.update();
  renderer.render(scene, camera);
}

function resize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Audio procedural: membuat ambience dengan Web Audio API, tanpa file MP3 eksternal.
class NatureAudio {
  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Browser ini tidak mendukung Web Audio API.");
    this.ctx = new AudioContextClass();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.nodes = {};
    this.makeNoise("rain", 1800, 0.025, 0.8);
    this.makeNoise("wind", 420, 0.018, 0.35);
    this.makeNoise("stream", 900, 0.018, 0.55);
    this.makeNoise("forest", 2600, 0.009, 0.18);
    this.makeTone("ocean", 95, 0.018);
    this.makeTone("evaporation", 520, 0.006);
  }

  makeNoise(name, frequency, gain, q) {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    source.connect(filter).connect(gainNode).connect(this.master);
    source.start();
    this.nodes[name] = gainNode;
  }

  makeTone(name, frequency, gain) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const wobble = this.ctx.createGain();
    wobble.gain.value = 7;
    lfo.connect(wobble).connect(osc.frequency);
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    osc.connect(gainNode).connect(this.master);
    osc.start();
    lfo.start();
    this.nodes[name] = gainNode;
  }

  async start() {
    await this.ctx.resume();
    this.master.gain.setTargetAtTime(1, this.ctx.currentTime, 0.15);
  }

  setVolume(value) {
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.08);
  }

  setScene(sceneName) {
    const levels = {
      evaporation: { evaporation: 0.8, wind: 0.25 },
      forest: { forest: 1, wind: 0.25 },
      wind: { wind: 1 },
      rain: { rain: 1, wind: 0.2 },
      stream: { stream: 1, forest: 0.2 },
      ocean: { ocean: 1, wind: 0.18 }
    };
    const selected = levels[sceneName] || {};
    Object.entries(this.nodes).forEach(([name, node]) => {
      node.gain.setTargetAtTime(selected[name] || 0, this.ctx.currentTime, 0.45);
    });
  }

  stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
  }
}

const soundButton = document.getElementById("soundButton");
const soundLabel = document.getElementById("soundLabel");
const volumeControl = document.getElementById("volumeControl");
const volumeValue = document.getElementById("volumeValue");

soundButton.addEventListener("click", async () => {
  try {
    if (!audioEngine) audioEngine = new NatureAudio();
    if (!audioEnabled) {
      await audioEngine.start();
      audioEnabled = true;
      audioEngine.setVolume(Number(volumeControl.value) / 100);
      audioEngine.setScene(stages[currentStage].sound);
      soundButton.textContent = "🔊 Matikan suara";
      soundButton.setAttribute("aria-pressed", "true");
      soundLabel.textContent = "Suara alam: aktif";
    } else {
      audioEngine.stop();
      audioEnabled = false;
      soundButton.textContent = "🔇 Aktifkan suara";
      soundButton.setAttribute("aria-pressed", "false");
      soundLabel.textContent = "Suara alam: mati";
    }
  } catch (error) {
    errorMessage.hidden = false;
    errorMessage.textContent = "Audio tidak dapat dijalankan di browser ini. Coba gunakan Chrome atau Edge terbaru.";
  }
});

volumeControl.addEventListener("input", () => {
  const value = Number(volumeControl.value);
  volumeValue.textContent = `${value}%`;
  if (audioEngine) audioEngine.setVolume(value / 100);
});

document.getElementById("prevStage").addEventListener("click", () => setStage(currentStage - 1));
document.getElementById("nextStage").addEventListener("click", () => setStage(currentStage + 1));
document.getElementById("playButton").addEventListener("click", (event) => {
  isPlaying = !isPlaying;
  event.currentTarget.textContent = isPlaying ? "Ⅱ Jeda" : "▶ Lanjutkan";
});
document.getElementById("resetButton").addEventListener("click", () => {
  elapsed = 0;
  isPlaying = true;
  document.getElementById("playButton").textContent = "Ⅱ Jeda";
  setStage(0);
  camera.position.set(12, 10, 18);
  controls.target.set(0, 2, 0);
  controls.update();
});

try {
  initScene();
  setupStageVisuals();
  clock = new THREE.Clock();
  updateStageUI();
  animate();
  window.addEventListener("resize", resize);
  setTimeout(() => loading.classList.add("hidden"), 500);
} catch (error) {
  loading.classList.add("hidden");
  errorMessage.hidden = false;
  errorMessage.textContent = "Simulasi 3D gagal dimuat. Pastikan koneksi internet aktif dan browser mendukung WebGL.";
  console.error(error);
}