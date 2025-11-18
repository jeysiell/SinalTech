// ==============================
// 🔔 Sistema de toque automático
// ==============================

let schedule = {};
let currentPeriod = detectCurrentPeriod();
let audioContext;
let nextTimeout = null;
let sinaisTocadosHoje = new Set(); // evita repetir o mesmo sinal no mesmo dia

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
  if (totalMinutes >= 360 && totalMinutes < 775) return "morning";      // 06:00 - 12:55
  if (totalMinutes >= 775 && totalMinutes < 1140) return "afternoon";   // 13:00 - 18:59
  return "night";                                                       // 19:00 - 05:59
}

// ==============================
// 🎶 Tocar sinal com fade
// ==============================
function initAudio(music = "sino.mp3") {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioElement = new Audio(`./assets/audio/${music}`);
    audioElement.crossOrigin = "anonymous";

    const source = audioContext.createMediaElementSource(audioElement);
    const gainNode = audioContext.createGain();

    const now = audioContext.currentTime;
    const fadeIn = 1;   // 1 segundo
    const fadeOut = 1;  // 1 segundo
    const totalDuration = 12;          // 8 segundos total
    const steadyDuration = totalDuration - fadeIn - fadeOut; // 6s de volume constante

    // Configura ganho (volume) com fade
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + fadeIn);                       // fade in
    gainNode.gain.setValueAtTime(0.3, now + fadeIn + steadyDuration);               // volume constante
    gainNode.gain.linearRampToValueAtTime(0.0, now + fadeIn + steadyDuration + fadeOut); // fade out

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    audioElement.play();

    // Limpeza após término
    setTimeout(() => {
      audioElement.pause();
      source.disconnect();
      gainNode.disconnect();
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
  const dayOfWeek = now.getDay();
  let effectivePeriod = currentPeriod;
  if (effectivePeriod === "afternoon" && dayOfWeek === 5) {
    effectivePeriod = "afternoonFriday";
  }

  const signals = schedule[effectivePeriod] || [];
  if (!signals.length) {
    console.warn("Nenhum horário configurado para este período.");
    return;
  }

  // Encontra o próximo sinal
  const nextSignal = signals.find(s => {
    const [h, m] = s.time.split(":").map(Number);
    const signalTime = new Date();
    signalTime.setHours(h, m, 0, 0);
    return signalTime > now;
  });

  if (!nextSignal) {
    console.log("✅ Todos os sinais do período já ocorreram.");
    updateSignalUI(null, null);
    return;
  }

  const [h, m] = nextSignal.time.split(":").map(Number);
  const nextTime = new Date();
  nextTime.setHours(h, m, 0, 0);
  const delay = nextTime - now;

  console.log(`⏱️ Próximo sinal às ${nextSignal.time} (${(delay / 60000).toFixed(1)} min)`);

  updateSignalUI(null, nextSignal);

  nextTimeout = setTimeout(() => {
    tocarSinal(nextSignal, signals);
  }, delay);
}

// ==============================
// 🔔 Tocar e reagendar
// ==============================
function tocarSinal(signal, signals) {
  const signalId = `${signal.time}-${currentPeriod}`;
  if (sinaisTocadosHoje.has(signalId)) {
    console.log(`⚠️ Sinal ${signal.time} já tocado hoje.`);
    return;
  }

  sinaisTocadosHoje.add(signalId);
  console.log(`🔔 Tocando sinal: ${signal.name} (${signal.time})`);

  const dur = signal.duration || 5;
  initAudio(signal.music || "sino.mp3", dur);
  updateSignalUI(signal, getNextSignal(signals, signal));

  // Agenda o próximo automaticamente
  startScheduler();
}

// ==============================
// ➕ Utilidades
// ==============================
function getNextSignal(signals, current) {
  const index = signals.indexOf(current);
  return index >= 0 && index < signals.length - 1 ? signals[index + 1] : null;
}

// ==============================
// 🧱 Atualização visual (UI)
// ==============================
function updateSignalUI(currentSignal, nextSignal) {
  const currentSignalTimeEl = document.getElementById("currentSignalTime");
  const currentSignalNameEl = document.getElementById("currentSignalName");
  const nextSignalTimeEl = document.getElementById("nextSignalTime");
  const nextSignalNameEl = document.getElementById("nextSignalName");

  if (currentSignal) {
    currentSignalTimeEl.textContent = currentSignal.time;
    currentSignalNameEl.textContent = currentSignal.name;
  } else {
    currentSignalTimeEl.textContent = "--:--";
    currentSignalNameEl.textContent = "Nenhum sinal ativo";
  }

  if (nextSignal) {
    nextSignalTimeEl.textContent = nextSignal.time;
    nextSignalNameEl.textContent = nextSignal.name;
  } else {
    nextSignalTimeEl.textContent = "--:--";
    nextSignalNameEl.textContent = "Fim do período";
  }
}

// ==============================
// 📊 Renderizar tabelas
// ==============================
function renderAllScheduleTables() {
  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;

  // Ajusta para sexta-feira
  const periods = ["morning", "afternoon", "afternoonFriday"];
  const tableIds = {
    morning: "scheduleTable-morning",
    afternoon: "scheduleTable-afternoon",
    afternoonFriday: "scheduleTable-afternoonFriday",
  };

  const musicLabels = {
    "musica1.mp3": "Tu me Sondas",
    "musica2.mp3": "Eu Amo a Minha Escola",
    "musica3.mp3": "My Lighthouse",
    "musica4.mp3": "Amor Teimoso "
  };

  periods.forEach(period => {
    const tableBody = document.getElementById(tableIds[period]);
    if (!tableBody) return;

    // Limpa e obtém os sinais correspondentes
    tableBody.innerHTML = "";
    const signals = schedule[period] || [];

    // Renderiza as linhas
    signals.forEach((signal, index) => {
      const row = document.createElement("tr");
      row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";
      const musicName = musicLabels[signal.music] || signal.music || "Sino padrão";
      const durationText = signal.duration ? `${signal.duration}s` : "";

      row.innerHTML = `
        <td class="py-3 px-4 text-gray-700">${signal.time}</td>
        <td class="py-3 px-4 text-gray-700 font-medium">${signal.name}</td>
        <td class="py-3 px-4 text-gray-700 font-medium">${musicName}</td>
        <td class="py-3 px-4 text-gray-700 font-medium">${durationText}</td>
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
      console.log(`🌅 Mudou de ${currentPeriod} → ${newPeriod}`);
      currentPeriod = newPeriod;
      loadSchedule(); // recarrega ao mudar de período
    }
  }, 60000);
});

// ==============================
// 🌐 Wake-up da API
// ==============================
async function wakeUpAPI() {
  try {
    console.log("⏳ Acordando API...");
    await fetch("https://sinal.onrender.com/api/schedule");
    console.log("✅ API pronta!");
  } catch (err) {
    console.error("⚠️ Falha ao acordar API, tentando novamente...");
    setTimeout(wakeUpAPI, 3000);
  }
}

// ==============================
// 🌐 Overlay da API
// ==============================

// Simula carregamento da API
setTimeout(() => {
  const status = document.getElementById("statusWake");
  const btn = document.getElementById("btnWakeOk");

  status.textContent = "API de sinais iniciada com sucesso!";
  btn.disabled = false;
  btn.classList.remove("bg-gray-600", "opacity-60", "cursor-not-allowed");
  btn.classList.add("bg-green-500", "hover:bg-green-600", "cursor-pointer");
}, 3000);

// Fecha overlay ao clicar em OK
document.getElementById("btnWakeOk").addEventListener("click", () => {
  document.getElementById("overlayWakeup").classList.add("opacity-0", "pointer-events-none");
  setTimeout(() => {
    document.getElementById("overlayWakeup").style.display = "none";
  }, 600);
});


// ==============================
// Atualiza o relogio
// ==============================
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const currentTimeEl = document.getElementById("currentTime");
  currentTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
}

// Inicializa o relógio e atualiza a cada segundo
updateClock();
setInterval(updateClock, 1000);

