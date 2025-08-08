let schedule = {};
let currentPeriod = detectCurrentPeriod();
let audioContext;
let sinaisTocadosHoje = new Set(); // Para evitar tocar duas vezes o mesmo horário

function loadSchedule() {
  fetch('https://sinal.onrender.com/api/schedule')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar horários: ' + response.statusText);
      return response.json();
    })
    .then(data => {
      schedule = data;
      currentPeriod = detectCurrentPeriod();
      renderAllScheduleTables();
    })
    .catch(error => {
      console.error('Erro ao carregar horários:', error);
      schedule = {};
      renderAllScheduleTables();
    });
}

function detectCurrentPeriod() {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  if (totalMinutes >= 360 && totalMinutes < 775) return "morning";      // 06:00 - 16:04
  if (totalMinutes >= 777 && totalMinutes < 1140) return "afternoon";   // 16:06 - 18:59
  return "night";                                                       // 19:00 - 05:59
}

setInterval(() => {
  const newPeriod = detectCurrentPeriod();
  if (newPeriod !== currentPeriod) {
    console.log("Período mudou de", currentPeriod, "para", newPeriod);
    currentPeriod = newPeriod;             // Atualiza o período
    loadSchedule();                        // Recarrega os horários do novo período
  }
}, 60000);

function initAudio(music = "sino.mp3", duration = 5) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioElement = new Audio(`./assets/audio/${music}`);
    audioElement.crossOrigin = "anonymous";

    const source = audioContext.createMediaElementSource(audioElement);
    const gainNode = audioContext.createGain();

    const now = audioContext.currentTime;
    const fadeIn = 0.3;
    const fadeOut = 0.3;

    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + fadeIn);                        // fade in
    gainNode.gain.setValueAtTime(0.3, now + fadeIn + duration);                      // volume constante
    gainNode.gain.linearRampToValueAtTime(0.0, now + fadeIn + duration + fadeOut);  // fade out

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    audioElement.play();

    const totalPlayTime = (fadeIn + duration + fadeOut) * 1000;
    setTimeout(() => {
      audioElement.pause();
      source.disconnect();
      gainNode.disconnect();
    }, totalPlayTime);
  } catch (e) {
    console.error("Erro ao tocar áudio:", e);
  }
}



function updateClock() {
  const now = new Date();
  document.getElementById("currentTime").textContent = now.toLocaleTimeString();
  checkSignalTimes(now);
}

function checkSignalTimes(now) {
  const dayOfWeek = now.getDay();
  let effectivePeriod = currentPeriod;
  if (currentPeriod === "afternoon" && dayOfWeek === 5) {
    effectivePeriod = "afternoonFriday";
  }

  const currentPeriodSignals = schedule[effectivePeriod] || [];
  const currentTimeStr = now.toTimeString().substring(0, 5); // formato "HH:MM"

  for (const signal of currentPeriodSignals) {
    if (signal.time === currentTimeStr && now.getSeconds() === 0) {
      const signalId = `${effectivePeriod}-${signal.time}`;
      if (!sinaisTocadosHoje.has(signalId)) {
        sinaisTocadosHoje.add(signalId);
        updateSignalUI(signal, getNextSignal(currentPeriodSignals, signal));
        let dur = signal.duration || 5; 
        dur = dur === 5 ? 12 : dur === 10 ? 22 : dur;
        initAudio(signal.music || "sino.mp3", dur);
        break;
      }
    }
  }
}

function getNextSignal(signals, current) {
  const index = signals.indexOf(current);
  return index >= 0 && index < signals.length - 1 ? signals[index + 1] : null;
}

function updateSignalUI(currentSignal, nextSignal) {
  const currentSignalTimeEl = document.getElementById("currentSignalTime");
  const currentSignalNameEl = document.getElementById("currentSignalName");
  const nextSignalTimeEl = document.getElementById("nextSignalTime");
  const nextSignalNameEl = document.getElementById("nextSignalName");

  if (currentSignal) {
    currentSignalTimeEl.textContent = currentSignal.time;
    currentSignalNameEl.textContent = currentSignal.name;
    currentSignalTimeEl.classList.remove("text-green-600");
    currentSignalTimeEl.classList.add("text-red-600");
  } else {
    currentSignalTimeEl.textContent = "--:--";
    currentSignalNameEl.textContent = "Nenhum sinal ativo";
    currentSignalTimeEl.classList.remove("text-red-600");
    currentSignalTimeEl.classList.add("text-green-600");
  }

  if (nextSignal) {
    nextSignalTimeEl.textContent = nextSignal.time;
    nextSignalNameEl.textContent = nextSignal.name;
  } else {
    nextSignalTimeEl.textContent = "--:--";
    nextSignalNameEl.textContent = "Fim do período";
  }
}

// NOVA função para renderizar as 3 tabelas simultaneamente
function renderAllScheduleTables() {
  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;

  const periods = ["morning", "afternoon", "night"];
  const tableIds = {
    morning: "scheduleTable-morning",
    afternoon: "scheduleTable-afternoon",
    night: "scheduleTable-evening",
  };

  const musicLabels = {
    "musica1.mp3": "Tu me Sondas",
    "musica2.mp3": "Eu Amo a Minha Escola",
    "musica3.mp3": "My Lighthouse"
  };

  periods.forEach(period => {
    const tableBody = document.getElementById(tableIds[period]);
    if (!tableBody) return;

    tableBody.innerHTML = "";

    const effectiveKey =
      period === "afternoon" && isFriday ? "afternoonFriday" : period;
    const signals = schedule[effectiveKey] || [];

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

function initApp() {
  loadSchedule();
  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener("DOMContentLoaded", initApp);
async function wakeUpAPI() {
  try {
    console.log("⏳ Acordando API de sinais...");
    await fetch("https://sinal.onrender.com/api/schedule", { method: "GET" });
    console.log("✅ API acordada com sucesso!");
  } catch (error) {
    console.error("⚠️ Erro ao acordar API:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("overlayWakeup");
  const btnOk = document.getElementById("btnWakeOk");

  // Chama a API assim que a página carrega
  wakeUpAPI();

  // Só libera quando o usuário clicar em OK
  btnOk.addEventListener("click", () => {
    overlay.style.display = "none";

    // Alguns navegadores bloqueiam áudio sem interação
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Inicia a aplicação
    initApp();
  });
});

