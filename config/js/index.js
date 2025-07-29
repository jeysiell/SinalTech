let schedule = {};
let currentPeriod = null;
let audioContext;

function loadSchedule() {
  fetch('https://sinal.onrender.com/api/schedule')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar horários: ' + response.statusText);
      return response.json();
    })
    .then(data => {
      schedule = data;
      currentPeriod = detectCurrentPeriod();
      renderScheduleTable();
      renderSignalButtons(); // 👈 adiciona os botões para reprodução manual
    })
    .catch(error => {
      console.error('Erro ao carregar horários:', error);
      schedule = {};
      renderScheduleTable();
    });
}

function detectCurrentPeriod() {
  const now = new Date();
  const hours = now.getHours();
  if (hours >= 6 && hours < 13) return "morning";
  if (hours >= 13 && hours < 19) return "afternoon";
  return "night";
}

function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioElement = new Audio("sino.mp3");
    audioElement.crossOrigin = "anonymous";

    const source = audioContext.createMediaElementSource(audioElement);
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 1);
    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime + 5);
    gainNode.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + 6);

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    audioElement.play();

    setTimeout(() => {
      audioElement.pause();
      source.disconnect();
      gainNode.disconnect();
    }, 7000);
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
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const signal of currentPeriodSignals) {
    const [hours, minutes] = signal.time.split(":").map(Number);
    const signalTime = hours * 60 + minutes;

    if (currentTime === signalTime && now.getSeconds() === 0) {
      updateSignalUI(signal, getNextSignal(currentPeriodSignals, signal));
      initAudio();
      break;
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

function renderScheduleTable() {
  const tableBody = document.getElementById("scheduleTable");
  tableBody.innerHTML = "";

  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;
  const signalsToRender =
    currentPeriod === "afternoon" && isFriday
      ? schedule["afternoonFriday"] || []
      : schedule[currentPeriod] || [];

  signalsToRender.forEach((signal, index) => {
    const row = document.createElement("tr");
    row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";
    row.innerHTML = `
      <td class="py-3 px-4 text-gray-700">${signal.time}</td>
      <td class="py-3 px-4 text-gray-700 font-medium">${signal.name}</td>
      <td class="py-3 px-4 text-gray-500 italic">Manual</td>
    `;
    tableBody.appendChild(row);
  });

  const periodNames = {
    morning: "Manhã",
    afternoon: isFriday ? "Tarde (Sexta-feira)" : "Tarde",
    night: "Noite",
  };

  document.getElementById("periodIndicator").textContent =
    `Período: ${periodNames[currentPeriod] || currentPeriod}`;
}

function renderSignalButtons() {
  const container = document.getElementById("manualSignalButtons");
  container.innerHTML = "";

  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;
  const signals =
    currentPeriod === "afternoon" && isFriday
      ? schedule["afternoonFriday"] || []
      : schedule[currentPeriod] || [];

  signals.forEach(signal => {
    const btn = document.createElement("button");
    btn.textContent = `${signal.time} - ${signal.name}`;
    btn.className = "bg-blue-600 text-white px-4 py-2 m-1 rounded hover:bg-blue-800";
    btn.onclick = () => {
      updateSignalUI(signal, getNextSignal(signals, signal));
      initAudio();
    };
    container.appendChild(btn);
  });
}

function initApp() {
  loadSchedule();
  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener("DOMContentLoaded", initApp);
