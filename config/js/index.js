// ==============================
// 🔔 Sistema de toque automático
// ==============================

let schedule = {};
let currentPeriod = detectCurrentPeriod();
let nextTimeout = null;
let sinaisTocadosHoje = new Set();
let audioContext = null;
let currentSource = null;

// ==============================
// 🔹 Carregar horários da API
// ==============================
async function loadSchedule() {
  try {
    const response = await fetch("https://sinal.onrender.com/api/schedule");
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

    schedule = await response.json();
    console.log("✅ Horários carregados:", schedule);

    currentPeriod = detectCurrentPeriod();
    renderAllScheduleTables();
    startScheduler();

  } catch (error) {
    console.error("❌ Erro ao carregar horários:", error);
    schedule = {};
  }
}

// ==============================
// 🕒 Detectar período atual
// ==============================
function detectCurrentPeriod() {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  if (totalMinutes >= 360 && totalMinutes < 775) return "morning";
  if (totalMinutes >= 775 && totalMinutes < 1140) return "afternoon";
  return "night";
}

// ==============================
// 🎶 Tocar sinal com fade
// ==============================
async function initAudio(music = "sino.mp3", duration = null, volume = 0.7) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (currentSource) {
      try { currentSource.stop(); } catch {}
      currentSource.disconnect();
      currentSource = null;
    }

    const audioElement = new Audio(`./assets/audio/${music}`);
    audioElement.crossOrigin = "anonymous";
    audioElement.preload = "auto";

    const source = audioContext.createMediaElementSource(audioElement);
    const gainNode = audioContext.createGain();

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    currentSource = source;

    const now = audioContext.currentTime;
    const fadeIn = 1;
    const fadeOut = 1;

    await audioElement.play();
    const audioDuration = duration || audioElement.duration || 10;

    const totalDuration = Math.max(audioDuration, fadeIn + fadeOut + 0.5);
    const steadyDuration = totalDuration - fadeIn - fadeOut;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + fadeIn);
    gainNode.gain.setValueAtTime(volume, now + fadeIn + steadyDuration);
    gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

    setTimeout(() => {
      audioElement.pause();
      source.disconnect();
      gainNode.disconnect();
      currentSource = null;
    }, totalDuration * 1000);

  } catch (e) {
    console.error("Erro ao tocar áudio:", e);
  }
}

// ==============================
// 🧭 Agendador inteligente
// ==============================
function startScheduler() {
  if (nextTimeout) clearTimeout(nextTimeout);

  const now = new Date();
  const todayKey = now.toDateString();

  if (startScheduler.lastDay !== todayKey) {
    sinaisTocadosHoje.clear();
    startScheduler.lastDay = todayKey;
    console.log("🌙 Novo dia detectado. Resetando sinais.");
  }

  const allSignals = getAllSignalsForToday();
  if (!allSignals.length) return;

  allSignals.sort((a, b) => a.date - b.date);
  const nextSignal = allSignals.find(s => s.date > now);

  if (!nextSignal) {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 5, 0);
    nextTimeout = setTimeout(startScheduler, tomorrow - now);
    return;
  }

  const delay = nextSignal.date - now;
  const lastSignal = getLastSignalToday();
  updateSignalUI(lastSignal, nextSignal);

  nextTimeout = setTimeout(() => {
    tocarSinal(nextSignal.original);
  }, delay);
}

// ==============================
// 🧾 Sinais do dia
// ==============================
function getAllSignalsForToday() {
  const now = new Date();
  const dayOfWeek = now.getDay();

  let periods = ["morning", "afternoon"];
  if (dayOfWeek === 5) periods.push("afternoonFriday");

  let result = [];

  periods.forEach(period => {
    (schedule[period] || []).forEach(signal => {
      const [h, m] = signal.time.split(":").map(Number);
      const date = new Date();
      date.setHours(h, m, 0, 0);

      result.push({ ...signal, period, date, original: signal });
    });
  });

  return result;
}

// ==============================
// 🔔 Tocar sinal
// ==============================
function tocarSinal(signal) {
  const signalId = `${signal.time}-${signal.name}-${new Date().toDateString()}`;

  if (sinaisTocadosHoje.has(signalId)) return;
  sinaisTocadosHoje.add(signalId);

  console.log(`🔔 Tocando: ${signal.name} (${signal.time})`);

  initAudio(signal.music || "sino.mp3", signal.duration || null);

  const nextSignal = getNextFutureSignal();
  updateSignalUI(signal, nextSignal);

  setTimeout(startScheduler, 1000);
}

function getNextFutureSignal() {
  const now = new Date();
  return getAllSignalsForToday()
    .filter(s => s.date > now)
    .sort((a, b) => a.date - b.date)[0] || null;
}

// ==============================
// 🧱 UI
// ==============================
function updateSignalUI(currentSignal, nextSignal) {
  const safeSet = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  safeSet("currentSignalTime", currentSignal?.time || "--:--");
  safeSet("currentSignalName", currentSignal?.name || "Aguardando...");
  safeSet("nextSignalTime", nextSignal?.time || "--:--");
  safeSet("nextSignalName", nextSignal?.name || "Fim do período");
}

function getLastSignalToday() {
  const now = new Date();
  return getAllSignalsForToday()
    .filter(s => s.date <= now)
    .sort((a, b) => b.date - a.date)[0] || null;
}

// ==============================
// 📊 Renderizar tabelas
// ==============================
function renderAllScheduleTables() {
  const periods = ["morning", "afternoon", "afternoonFriday"];

  const tableIds = {
    morning: "scheduleTable-morning",
    afternoon: "scheduleTable-afternoon",
    afternoonFriday: "scheduleTable-afternoonFriday",
  };

  periods.forEach(period => {
    const tableBody = document.getElementById(tableIds[period]);
    if (!tableBody) return;

    tableBody.innerHTML = "";

    (schedule[period] || []).forEach((signal, index) => {
      const row = document.createElement("tr");
      row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";

      row.innerHTML = `
        <td class="py-3 px-4">${signal.time}</td>
        <td class="py-3 px-4 font-medium">${signal.name}</td>
        <td class="py-3 px-4">${signal.music || "sino.mp3"}</td>
        <td class="py-3 px-4">${signal.duration || ""}</td>
      `;
      tableBody.appendChild(row);
    });
  });
}

// ==============================
// 🚀 Inicialização
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  await wakeUpAPI();
  loadSchedule();

  setInterval(() => {
    const newPeriod = detectCurrentPeriod();
    if (newPeriod !== currentPeriod) {
      currentPeriod = newPeriod;
      loadSchedule();
    }
  }, 60000);

  updateClock();
  setInterval(updateClock, 1000);
});

// ==============================
// 🌐 Wake API
// ==============================
async function wakeUpAPI() {
  try {
    await fetch("https://sinal.onrender.com/api/schedule");
  } catch {
    setTimeout(wakeUpAPI, 3000);
  }
}

// ==============================
// ⏰ Relógio
// ==============================
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR");
  const el = document.getElementById("currentTime");
  if (el) el.textContent = time;
}