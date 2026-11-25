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
let animationRunId = 0;
let audioContext = null;

function readSetting(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : saved === "true";
    } catch {
        return fallback;
    }
}

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch (error) {
        console.warn("Не удалось сохранить настройку:", error);
    }
}

if (soundToggle) {
    soundToggle.checked = readSetting("pixelopoly-sound", false);

    soundToggle.addEventListener("change", () => {
        saveSetting("pixelopoly-sound", soundToggle.checked);
    });
}

if (animationToggle) {
    animationToggle.checked = readSetting("pixelopoly-animation", true);

    animationToggle.addEventListener("change", () => {
        saveSetting("pixelopoly-animation", animationToggle.checked);

        if (animationToggle.checked) {
            startAnimation();
        } else {
            stopAnimation();
            showStaticScene();
        }
    });
}

if (openSettingsButton && settingsDialog) {
    openSettingsButton.addEventListener("click", () => {
        settingsDialog.showModal();
    });
}

if (settingsDialog) {
    settingsDialog.addEventListener("click", (event) => {
        if (event.target === settingsDialog) {
            settingsDialog.close();
        }
    });
}

function playMagicSound() {
    if (!soundToggle?.checked) return;

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        audioContext ||= new AudioContextClass();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

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
    if (dragon) dragon.src = ASSET.dragon(frame);
}

function setMage(frame) {
    if (mage) mage.src = ASSET.mage(frame);
}

function setProjectile(frame) {
    if (projectile) projectile.src = ASSET.effect(frame);
}

function resetScene() {
    if (!dragon || !mage || !projectile || !scene || !victoryEffects) return;

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

    if (dragon) dragon.style.opacity = "1";
    if (mage) mage.style.opacity = "1";
}

function stillActive(runId) {
    return Boolean(animationToggle?.checked) && runId === animationRunId;
}

async function pause(ms, runId) {
    await sleep(ms);
    return stillActive(runId);
}

async function runAnimation(runId) {
    if (!dragon || !mage || !projectile || !scene || !victoryEffects) return;

    resetScene();
    scene.classList.add("is-running");

    setDragon("ad-1");
    if (!(await pause(900, runId))) return;

    setDragon("ad-2");
    if (!(await pause(850, runId))) return;

    setDragon("ad-3");
    if (!(await pause(1250, runId))) return;

    setDragon("ad-4");
    if (!(await pause(650, runId))) return;

    setMage("am-1");
    if (!(await pause(350, runId))) return;

    setMage("am-2");
    if (!(await pause(350, runId))) return;

    setMage("am-3");
    if (!(await pause(350, runId))) return;

    setMage("am-4");
    if (!(await pause(350, runId))) return;

    setMage("am-5");
    if (!(await pause(350, runId))) return;

    setProjectile("af-1");
    projectile.classList.add("is-flying");
    playMagicSound();

    if (!(await pause(280, runId))) return;

    setProjectile("af-2");
    if (!(await pause(300, runId))) return;

    setProjectile("af-3");
    if (!(await pause(420, runId))) return;

    projectile.classList.remove("is-flying");
    projectile.style.opacity = "0";

    dragon.classList.add("is-hit");
    setDragon("ad-5");
    playMagicSound();

    if (!(await pause(550, runId))) return;

    setDragon("ad-6");
    dragon.classList.remove("is-hit");
    dragon.classList.add("is-defeated");

    setMage("am-6");
    mage.classList.add("is-victorious");
    victoryEffects.classList.add("is-visible");

    await pause(2600, runId);
}

async function animationLoop(runId) {
    while (stillActive(runId)) {
        await runAnimation(runId);

        if (!stillActive(runId)) break;
        if (!(await pause(900, runId))) break;
    }
}

function startAnimation() {
    stopAnimation();

    if (!animationToggle?.checked) return;

    const runId = animationRunId;

    animationTimer = window.setTimeout(() => {
        animationTimer = null;
        animationLoop(runId);
    }, 250);
}

function stopAnimation() {
    if (animationTimer !== null) {
        window.clearTimeout(animationTimer);
        animationTimer = null;
    }

    animationRunId++;
}

if (animationToggle?.checked) {
    startAnimation();
} else {
    showStaticScene();
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopAnimation();
    } else if (animationToggle?.checked) {
        startAnimation();
    }
});

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

motionQuery.addEventListener("change", (event) => {
    if (event.matches) {
        stopAnimation();

        if (animationToggle) {
            animationToggle.checked = false;
        }

        saveSetting("pixelopoly-animation", false);
        showStaticScene();
    }
});