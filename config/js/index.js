let schedule = {}; // Inicializa a variável schedule como um objeto vazio
let currentPeriod = null; // Inicializa currentPeriod como null
let editIndex = null;
let audioContext;

// Recuperar dados da API
function loadSchedule() {
  fetch('https://sinal.onrender.com/api/schedule')
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao carregar horários: ' + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      schedule = data; // Atribui os dados da API à variável schedule
      currentPeriod = detectCurrentPeriod(); // Define o período atual com base na hora
      renderScheduleTable(); // Renderiza a tabela de horários
    })
    .catch(error => {
      console.error('Erro ao carregar horários:', error);
      schedule = {}; // Se houver erro, mantém schedule como um objeto vazio
      renderScheduleTable(); // Renderiza a tabela de horários
    });
}

function detectCurrentPeriod() {
  const now = new Date();
  const hours = now.getHours();

  if (hours >= 6 && hours < 13) {
    return "morning";
  } else if (hours >= 13 && hours < 19) {
    return "afternoon";
  } else {
    return "night";
  }
}

// Inicializar áudio
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

// Atualizar relógio
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  document.getElementById("currentTime").textContent = timeStr;
  checkSignalTimes(now);
}

// Verificar horários dos sinais
function checkSignalTimes(now) {
  const dayOfWeek = now.getDay();
  let effectivePeriod = currentPeriod;

  if (currentPeriod === "afternoon" && dayOfWeek === 5) {
    effectivePeriod = "afternoonFriday";
  }

  const currentPeriodSignals = schedule[effectivePeriod] || []; // Usa um array vazio se não houver sinais
  const currentTime = now.getHours() * 60 + now.getMinutes();
  let currentSignal = null;
  let nextSignal = null;

  for (let i = 0; i < currentPeriodSignals.length; i++) {
    const signal = currentPeriodSignals[i];
    const [hours, minutes] = signal.time.split(":").map(Number);
    const signalTime = hours * 60 + minutes;
    const signalEndTime = signalTime + signal.duration;

    if (currentTime >= signalTime && currentTime < signalEndTime) {
      currentSignal = signal;
      if (i < currentPeriodSignals.length - 1) {
        nextSignal = currentPeriodSignals[i + 1];
      }
      break;
    } else if (currentTime < signalTime) {
      nextSignal = signal;
      break;
    }
  }

  updateSignalUI(currentSignal, nextSignal);

  if (currentSignal && now.getSeconds() === 0) {
    const [hours, minutes] = currentSignal.time.split(":");
    if (now.getHours() == hours && now.getMinutes() == minutes) {
      initAudio();
    }
  }

  if (!nextSignal && currentSignal && now.getSeconds() === 0) {
    const periodOrder = ["morning", "afternoon"];
    const currentIndex = periodOrder.indexOf(currentPeriod);
    const nextPeriod = periodOrder[currentIndex + 1];

    if (nextPeriod) {
      currentPeriod = nextPeriod;
      renderScheduleTable();
      renderConfigForm();
      console.log(`Mudando automaticamente para o período: ${nextPeriod}`);
    }
  }
}

// Atualizar UI dos sinais
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

// Renderizar tabela de horários
function renderScheduleTable() {
  const tableBody = document.getElementById("scheduleTable");
  tableBody.innerHTML = "";

  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;

  const signalsToRender =
    currentPeriod === "afternoon" && isFriday
      ? schedule["afternoonFriday"] || [] // Usa um array vazio se não houver sinais
      : schedule[currentPeriod] || []; // Usa um array vazio se não houver sinais

  signalsToRender.forEach((signal, index) => {
    const row = document.createElement("tr");
    row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";
    row.innerHTML = `
      <td class="py-3 px-4 text-gray-700">${signal.time}</td>
      <td class="py-3 px-4 text-gray-700 font-medium">${signal.name}</td>
      <td class="py-3 px-4 text-gray-700">${signal.duration} min</td>
    `;
    tableBody.appendChild(row);
  });

  const periodNames = {
    morning: "Manhã",
    afternoon: isFriday ? "Tarde (Sexta-feira)" : "Tarde",
  };

  document.getElementById("periodIndicator").textContent =
    `Período: ${periodNames[currentPeriod]}`;
}

// Renderizar formulário de configuração
function renderConfigForm() {
  const periodConfig = document.getElementById("periodConfig");
  periodConfig.innerHTML = "";

  const currentSignals = schedule[currentPeriod] || []; // Usa um array vazio se não houver sinais

  if (currentSignals.length === 0) {
    periodConfig.innerHTML =
      '<p class="text-gray-500">Nenhum horário cadastrado para este período.</p>';
    return;
  }

  currentSignals.forEach((signal, index) => {
    const signalDiv = document.createElement("div");
    signalDiv.className =
      "bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center";

    signalDiv.innerHTML = `
      <div class="sm:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Horário</label>
        <input type="time" value="${signal.time}" class="time-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div class="sm:col-span-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Sinal</label>
        <input type="text" value="${signal.name}" class="name-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div class="sm:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
        <input type="number" min="1" value="${signal.duration}" class="duration-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div class="sm:col-span-2 flex space-x-2 justify-end">
        <button class="edit-btn px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition" data-index="${index}">
          <i class="fas fa-save"></i>
        </button>
        <button class="delete-btn px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    periodConfig.appendChild(signalDiv);
  });
}

// Adicionar novo horário
function addNewTime() {
  schedule[currentPeriod].push({
    time: "00:00",
    name: "Novo Sinal",
    duration: 1,
  });

  renderConfigForm();
  document.querySelector("#periodConfig").lastElementChild.scrollIntoView();
}

// Salvar configurações
function saveConfiguration() {
  saveSchedule();
  renderScheduleTable();
  document.getElementById("configModal").classList.add("hidden");
}

// Trocar período selecionado
function switchPeriod(period) {
  currentPeriod = period;

  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;

  const periodNames = {
    morning: "Manhã",
    afternoon: isFriday ? "Tarde (Sexta-feira)" : "Tarde",
    afternoonFriday: "Tarde (Sexta-feira)",
  };

  document.querySelectorAll(".period-btn").forEach((btn) => {
    if (btn.dataset.period === period) {
      btn.classList.remove("bg-gray-200", "text-gray-700");
      btn.classList.add("bg-blue-600", "text-white");
    } else {
      btn.classList.remove("bg-blue-600", "text-white");
      btn.classList.add("bg-gray-200", "text-gray-700");
    }
  });

  document.getElementById("periodIndicator").textContent =
    "Período: " + periodNames[period];

  renderConfigForm();
}

// Inicializar aplicação
function initApp() {
  loadSchedule();

  updateClock();
  setInterval(updateClock, 1000);

  renderScheduleTable();

  document.getElementById("configBtn").addEventListener("click", () => {
    document.getElementById("configModal").classList.remove("hidden");
    renderConfigForm();
  });

  document.getElementById("closeConfigBtn").addEventListener("click", () => {
    document.getElementById("configModal").classList.add("hidden");
  });

  document.getElementById("cancelConfigBtn").addEventListener("click", () => {
    loadSchedule(); // Reverte quaisquer alterações não salvas
    document.getElementById("configModal").classList.add("hidden");
  });

  document.getElementById("saveConfigBtn").addEventListener("click", saveConfiguration);
  document.getElementById("addTimeBtn").addEventListener("click", addNewTime);

  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchPeriod(btn.dataset.period));
  });

  document.getElementById("periodConfig").addEventListener("click", (e) => {
    if (e.target.closest(".delete-btn")) {
      const index = e.target.closest(".delete-btn").dataset.index;
      schedule[currentPeriod].splice(index, 1);
      renderConfigForm();
    }
  });

  document.getElementById("periodConfig").addEventListener("change", (e) => {
    if (
      e.target.closest(".time-input") ||
      e.target.closest(".name-input") ||
      e.target.closest(".duration-input")
    ) {
      const row = e.target.closest(".bg-gray-50");
      const index = Array.from(row.parentNode.children).indexOf(row);

      schedule[currentPeriod][index] = {
        time: row.querySelector(".time-input").value,
        name: row.querySelector(".name-input").value,
        duration: parseInt(row.querySelector(".duration-input").value),
      };
    }
  });
}

// Iniciar quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", initApp);
