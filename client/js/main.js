const dragon = document.getElementById("dragon");
const mage = document.getElementById("mage");
const projectile = document.getElementById("projectile");
const victoryEffects = document.getElementById("victory-effects");
const scene = document.getElementById("battle-scene");

const settingsDialog = document.getElementById("settings-dialog");
const openSettingsButton = document.getElementById("open-settings");
const soundToggle = document.getElementById("sound-toggle");
const animationToggle = document.getElementById("animation-toggle");

const ASSET = {
  dragon: (name) => `../../img/main/${name}.png`,
  mage: (name) => `../../img/main/${name}.png`,
  effect: (name) => `../../img/main/${name}.png`
};

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

let animationTimer = null;
let audioContext = null;

function readSetting(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved === null ? fallback : saved === "true";
}

function saveSetting(key, value) {
  localStorage.setItem(key, String(value));
}

soundToggle.checked = readSetting("pixelopoly-sound", false);
animationToggle.checked = readSetting("pixelopoly-animation", true);

openSettingsButton.addEventListener("click", () => {
  settingsDialog.showModal();
});

soundToggle.addEventListener("change", () => {
  saveSetting("pixelopoly-sound", soundToggle.checked);
});

animationToggle.addEventListener("change", () => {
  saveSetting("pixelopoly-animation", animationToggle.checked);
  if (animationToggle.checked) {
    startAnimation();
  } else {
    stopAnimation();
    showStaticScene();
  }
});

function playMagicSound() {
  if (!soundToggle.checked) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.22);
    oscillator.frequency.exponentialRampToValueAtTime(260, audioContext.currentTime + 0.62);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.65);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.66);
  } catch (error) {
    console.warn("Звуковой эффект недоступен:", error);
  }
}

function setDragon(frame) {
  dragon.src = ASSET.dragon(frame);
}

function setMage(frame) {
  mage.src = ASSET.mage(frame);
}

function setProjectile(frame) {
  projectile.src = ASSET.effect(frame);
}

function resetScene() {
  scene.classList.remove("is-running");
  dragon.classList.remove("is-hit", "is-defeated");
  mage.classList.remove("is-victorious");
  projectile.classList.remove("is-flying");
  victoryEffects.classList.remove("is-visible");

  dragon.style.opacity = "";
  mage.style.opacity = "";
  projectile.style.opacity = "";

  setDragon("ad-1");
  setMage("am-1");
  setProjectile("af-1");
}

function showStaticScene() {
  resetScene();
  dragon.style.opacity = "1";
  mage.style.opacity = "1";
}

async function runAnimation() {
  resetScene();
  scene.classList.add("is-running");

  setDragon("ad-1");
  await sleep(900);
  if (!animationToggle.checked) return;
  setDragon("ad-2");

  // Дракон выпускает огонь.
  await sleep(850);
  if (!animationToggle.checked) return;
  setDragon("ad-3");
  await sleep(1250);
  if (!animationToggle.checked) return;
  setDragon("ad-4");

  await sleep(650);
  if (!animationToggle.checked) return;
  setMage("am-1");
  await sleep(350);
  setMage("am-2");
  await sleep(350);
  setMage("am-3");
  await sleep(350);
  setMage("am-4");
  await sleep(350);
  setMage("am-5");

  await sleep(350);
  if (!animationToggle.checked) return;
  setProjectile("af-1");
  projectile.classList.add("is-flying");
  playMagicSound();

  await sleep(280);
  setProjectile("af-2");
  await sleep(300);
  setProjectile("af-3");
  await sleep(420);

  projectile.classList.remove("is-flying");
  projectile.style.opacity = "0";
  dragon.classList.add("is-hit");
  setDragon("ad-5");
  playMagicSound();

  await sleep(550);
  if (!animationToggle.checked) return;
  setDragon("ad-6");
  dragon.classList.remove("is-hit");
  dragon.classList.add("is-defeated");

  setMage("am-6");
  mage.classList.add("is-victorious");
  victoryEffects.classList.add("is-visible");

  await sleep(2600);
}

async function animationLoop() {
  while (animationToggle.checked) {
    await runAnimation();
    if (!animationToggle.checked) break;
    await sleep(900);
  }
}

function startAnimation() {
  stopAnimation();
  animationTimer = window.setTimeout(() => {
    animationLoop();
  }, 250);
}

function stopAnimation() {
  if (animationTimer) {
    window.clearTimeout(animationTimer);
    animationTimer = null;
  }
}

if (animationToggle.checked && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  startAnimation();
} else {
  animationToggle.checked = false;
  showStaticScene();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAnimation();
  } else if (animationToggle.checked) {
    startAnimation();
  }
});

window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (event) => {
  if (event.matches) {
    stopAnimation();
    animationToggle.checked = false;
    saveSetting("pixelopoly-animation", false);
    showStaticScene();
  }
});
