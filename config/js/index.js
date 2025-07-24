// Dados padrão dos horários (será salvo no localStorage)
const defaultSchedule = {
  morning: [
    { time: "07:00", name: "Entrada", duration: 5 },
    { time: "07:05", name: "1ª Aula", duration: 45 },
    { time: "07:50", name: "2ª Aula", duration: 45 },
    { time: "08:35", name: "Intervalo", duration: 20 },
    { time: "08:55", name: "3ª Aula", duration: 45 },
    { time: "09:40", name: "4ª Aula", duration: 45 },
    { time: "10:25", name: "Intervalo", duration: 15 },
    { time: "10:40", name: "5ª Aula", duration: 45 },
    { time: "11:25", name: "6ª Aula", duration: 45 },
    { time: "12:10", name: "Saída", duration: 5 },
  ],
  afternoon: [
    { time: "13:00", name: "Entrada", duration: 5 },
    { time: "13:05", name: "1ª Aula", duration: 45 },
    { time: "13:50", name: "2ª Aula", duration: 45 },
    { time: "14:35", name: "Intervalo", duration: 20 },
    { time: "14:55", name: "3ª Aula", duration: 45 },
    { time: "15:40", name: "4ª Aula", duration: 45 },
    { time: "16:25", name: "Intervalo", duration: 15 },
    { time: "16:40", name: "5ª Aula", duration: 45 },
    { time: "17:25", name: "6ª Aula", duration: 45 },
    { time: "18:10", name: "Saída", duration: 5 },
  ],
  night: [
    { time: "19:00", name: "Entrada", duration: 5 },
    { time: "19:05", name: "1ª Aula", duration: 45 },
    { time: "19:50", name: "2ª Aula", duration: 45 },
    { time: "20:35", name: "Intervalo", duration: 20 },
    { time: "20:55", name: "3ª Aula", duration: 45 },
    { time: "21:40", name: "4ª Aula", duration: 45 },
    { time: "22:25", name: "Saída", duration: 5 },
  ],
};

let schedule = JSON.parse(JSON.stringify(defaultSchedule));
let currentPeriod = "morning";
let editIndex = null;
let audioContext;
let bellSound;

// Recuperar dados salvos do localStorage
function loadSchedule() {
  const savedSchedule = localStorage.getItem("schoolSchedule");
  if (savedSchedule) {
    schedule = JSON.parse(savedSchedule);
  }
}

// Salvar dados no localStorage
function saveSchedule() {
  localStorage.setItem("schoolSchedule", JSON.stringify(schedule));
}

// Inicializar áudio
function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const audioElement = new Audio("../assets/audio/sinal.mp3"); // Arquivo de música, deve estar na mesma pasta
    audioElement.crossOrigin = "anonymous"; // Evita erros se for carregado de outro domínio

    const source = audioContext.createMediaElementSource(audioElement);
    const gainNode = audioContext.createGain();

    // Configura o ganho inicial
    gainNode.gain.setValueAtTime(0.0, audioContext.currentTime);

    // Fade in: 0s até 1s → de 0 a 1
    gainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 1);

    // Fade out: começa em 5s e termina em 6s → de 1 a 0
    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime + 5);
    gainNode.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + 6);

    // Conectar os nós
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Tocar música
    audioElement.play();

    // Parar e desconectar após 7s para liberar recursos
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

  // Verificar se é hora de tocar o sinal
  checkSignalTimes(now);
}

// Verificar horários dos sinais
function checkSignalTimes(now) {
  const currentPeriodSignals = schedule[currentPeriod];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  let currentSignal = null;
  let nextSignal = null;

  for (let i = 0; i < currentPeriodSignals.length; i++) {
    const signal = currentPeriodSignals[i];
    const [hours, minutes] = signal.time.split(":").map(Number);
    const signalTime = hours * 60 + minutes;

    // Adicionar a duração para pegar o tempo final do sinal
    const signalEndTime = signalTime + signal.duration;

    if (currentTime >= signalTime && currentTime < signalEndTime) {
      currentSignal = signal;

      // Definir próximo sinal como o próximo na lista, se houver
      if (i < currentPeriodSignals.length - 1) {
        nextSignal = currentPeriodSignals[i + 1];
      }
      break;
    } else if (currentTime < signalTime) {
      nextSignal = signal;
      break;
    }
  }

  // Atualizar UI
  updateSignalUI(currentSignal, nextSignal);

  // Tocar sinal se for o minuto exato
  if (currentSignal && now.getSeconds() === 0) {
    const [hours, minutes] = currentSignal.time.split(":");
    if (now.getHours() == hours && now.getMinutes() == minutes) {
      initAudio();
    }
  }

  // Se não houver próximo sinal, mudar para o próximo período automaticamente
  if (!nextSignal && currentSignal && now.getSeconds() === 0) {
    const periodOrder = ["morning", "afternoon", "night"];
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

  const currentSignals = schedule[currentPeriod];

  currentSignals.forEach((signal, index) => {
    const row = document.createElement("tr");
    row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";
    row.innerHTML = `
                    <td class="py-3 px-4 text-gray-700">${signal.time}</td>
                    <td class="py-3 px-4 text-gray-700 font-medium">${signal.name}</td>
                    <td class="py-3 px-4 text-gray-700">${signal.duration} min</td>
                `;
    tableBody.appendChild(row);
  });

  // Atualizar indicador de período
  const periodNames = {
    morning: "Manhã",
    afternoon: "Tarde",
    night: "Noite",
  };
  document.getElementById(
    "periodIndicator"
  ).textContent = `Período: ${periodNames[currentPeriod]}`;
}

// Renderizar formulário de configuração
function renderConfigForm() {
  const periodConfig = document.getElementById("periodConfig");
  periodConfig.innerHTML = "";

  const currentSignals = schedule[currentPeriod];

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
  // Rolagem para baixo para mostrar o novo item
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

  // Atualizar botões ativos
  document.querySelectorAll(".period-btn").forEach((btn) => {
    if (btn.dataset.period === period) {
      btn.classList.remove("bg-gray-200", "text-gray-700");
      btn.classList.add("bg-blue-600", "text-white");
    } else {
      btn.classList.remove("bg-blue-600", "text-white");
      btn.classList.add("bg-gray-200", "text-gray-700");
    }
  });

  renderConfigForm();
}

// Inicializar aplicação
function initApp() {
  loadSchedule();

  // Atualizar relógio a cada segundo
  updateClock();
  setInterval(updateClock, 1000);

  // Renderizar tabela inicial
  renderScheduleTable();

  // Event Listeners
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

  document
    .getElementById("saveConfigBtn")
    .addEventListener("click", saveConfiguration);

  document.getElementById("addTimeBtn").addEventListener("click", addNewTime);

  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchPeriod(btn.dataset.period));
  });

  // Delegated events para os botões dinâmicos do formulário
  document.getElementById("periodConfig").addEventListener("click", (e) => {
    if (e.target.closest(".delete-btn")) {
      const index = e.target.closest(".delete-btn").dataset.index;
      schedule[currentPeriod].splice(index, 1);
      renderConfigForm();
    }
  });

  // Atualizar quando os valores dos inputs são alterados
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
