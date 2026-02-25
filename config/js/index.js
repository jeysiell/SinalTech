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
// ==============================
// 🎶 ÁUDIO PROFISSIONAL – 10s EXATOS + ANTI-TRAVAMENTO
// ==============================
async function initAudio(music = "sino.mp3", duration = 10, volume = 0.8) {
  try {
    // 🔁 Garante apenas 1 AudioContext
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 🔄 Se estiver suspenso (Chrome faz isso sozinho)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // 🛑 Para qualquer áudio anterior com segurança
    if (currentSource) {
      try {
        currentSource.gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        currentSource.gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        currentSource.audio.pause();
      } catch {}
      currentSource = null;
    }

    const audio = new Audio(`./assets/audio/${music}`);
    audio.loop = true; // 🔁 repete se for menor que 10s
    audio.preload = "auto";

    const source = audioContext.createMediaElementSource(audio);
    const gainNode = audioContext.createGain();

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const fadeIn = 1;
    const fadeOut = 1;
    const totalDuration = duration; // 🔥 10 segundos exatos

    // 🎚️ Fade profissional
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + fadeIn);
    gainNode.gain.setValueAtTime(volume, now + totalDuration - fadeOut);
    gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

    await audio.play();

    currentSource = {
      audio,
      gainNode
    };

    // ⏱️ Para exatamente em 10 segundos
    setTimeout(() => {
      try {
        audio.pause();
        audio.currentTime = 0;
        source.disconnect();
        gainNode.disconnect();
      } catch {}
      currentSource = null;
    }, totalDuration * 1000);

  } catch (err) {
    console.error("🔴 Falha no áudio:", err);

    // 🔄 tentativa automática de recuperação
    try {
      if (audioContext) {
        await audioContext.close();
      }
    } catch {}

    audioContext = null;
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

  // 🔥 animação visual
  if (typeof triggerSignalAnimation === "function") {
    triggerSignalAnimation();
  }

  initAudio(signal.music || "sino.mp3", 10);

  const nextSignal = getNextFutureSignal();
  updateSignalUI(signal, nextSignal);

  setTimeout(() => {
  startScheduler();
}, 500);
}

function getNextFutureSignal() {
  const now = new Date();
  const signals = getAllSignalsForToday();

  let next = null;

  for (const s of signals) {
    if (s.date > now && (!next || s.date < next.date)) {
      next = s;
    }
  }

  return next;
}

// ==============================
// 🧱 UI
// ==============================
function updateSignalUI(currentSignal, nextSignal) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("currentSignalTime", currentSignal?.time || "--:--");
  set("currentSignalName", currentSignal?.name || "Aguardando...");
  set("nextSignalTime", nextSignal?.time || "--:--");
  set("nextSignalName", nextSignal?.name || "Fim do período");
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

  const musicLabels = {
    "musica1.mp3": "🎵 Tu Me Sondas",
    "musica2.mp3": "🎵 Eu Amo Minha Escola",
    "musica3.mp3": "🎵 My Lighthouse",
    "musica4.mp3": "🎵 Amor Teimoso",
    "sino.mp3": "🔔 Sino Padrão"
  };

  periods.forEach(period => {
    const tableBody = document.getElementById(tableIds[period]);
    if (!tableBody) return;

    tableBody.innerHTML = "";

    (schedule[period] || []).forEach((signal, index) => {
      const row = document.createElement("tr");
      row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";

      const friendlyMusic =
        musicLabels[signal.music] || signal.music || "🔔 Sino Padrão";

      row.innerHTML = `
        <td class="py-3 px-4">${signal.time}</td>
        <td class="py-3 px-4 font-medium">${signal.name}</td>
        <td class="py-3 px-4">${friendlyMusic}</td>
        <td class="py-3 px-4">${signal.duration ? signal.duration + "s" : ""}</td>
      `;

      tableBody.appendChild(row);
    });
  });
}

// ==============================
// 🌐 Wake-up da API + Overlay
// ==============================
async function wakeUpAPI() {
  const status = document.getElementById("statusWake");
  const btn = document.getElementById("btnWakeOk");

  try {
    status.textContent = "Conectando à API...";
    btn.disabled = true;

    const response = await fetch("https://sinal.onrender.com/api/schedule");
    if (!response.ok) throw new Error();

    status.textContent = "✅ Sistema pronto!";
    btn.disabled = false;
    btn.classList.remove("bg-slate-700", "opacity-50", "cursor-not-allowed");
    btn.classList.add("bg-green-500", "hover:bg-green-600", "cursor-pointer");

  } catch {
    status.textContent = "❌ Tentando reconectar...";
    setTimeout(wakeUpAPI, 3000);
  }
}

// ==============================
// ⏰ Relógio
// ==============================
function updateClock() {
  const now = new Date();
  const el = document.getElementById("currentTime");
  if (el) el.textContent = now.toLocaleTimeString("pt-BR");
}

// ==============================
// 🚀 Inicialização ÚNICA
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

  // 🔹 Botão fechar overlay
  const btn = document.getElementById("btnWakeOk");
  const overlay = document.getElementById("overlayWakeup");

  if (btn && overlay) {
    btn.addEventListener("click", () => {
      overlay.classList.add("opacity-0", "pointer-events-none");

      setTimeout(() => {
        overlay.style.display = "none";
      }, 600);
    });
  }
});