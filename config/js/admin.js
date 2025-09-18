let schedule = {}; // Inicializa a variável schedule como um objeto vazio
let currentPeriod = null; // Inicializa currentPeriod como null
let editIndex = null; // Para rastrear o índice do horário a ser editado

// Recuperar dados da API
function loadSchedule() {
  fetch("https://sinal.onrender.com/api/schedule")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erro ao carregar horários: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      schedule = data; // Atribui os dados da API à variável schedule
      renderScheduleTable(); // Renderiza a tabela de horários
      renderConfigForm(); // Renderiza o formulário de configuração
    })
    .catch((error) => {
      console.error("Erro ao carregar horários:", error);
      schedule = {}; // Se houver erro, mantém schedule como um objeto vazio
      renderScheduleTable(); // Renderiza a tabela de horários
    });
}

// Renderizar tabela de horários
function renderScheduleTable() {
  const tableBody = document.getElementById("scheduleTable");
  tableBody.innerHTML = "";

  const periods = ["morning", "afternoon", "afternoonFriday"];

  // Mapeia o nome do arquivo de música para um nome amigável
  const musicLabels = {
    "musica1.mp3": "Tu me Sondas",
    "musica2.mp3": "Eu Amo a Minha Escola",
    "musica3.mp3": "My Lighthouse"
  };

  periods.forEach((period) => {
    const signalsToRender = schedule[period] || [];

    signalsToRender.forEach((signal, index) => {
      const row = document.createElement("tr");
      row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";

      // Converte o nome da música e adiciona o 'S' de segundos
      const musicName = musicLabels[signal.music] || signal.music;
      const durationText = `${signal.duration}s`;

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
        <label class="block text-sm font-medium text-gray-700 mb-1">Música</label>
        <select class="music-select w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="musica1.mp3" ${signal.music === "musica1.mp3" ? "selected" : ""}>Tu me Sondas</option>
          <option value="musica2.mp3" ${signal.music === "musica2.mp3" ? "selected" : ""}>Eu Amo a Minha Escola</option>
          <option value="musica3.mp3" ${signal.music === "musica3.mp3" ? "selected" : ""}>My Lighthouse</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Duração</label>
        <select class="duration-select w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="5" ${signal.duration == 5 ? "selected" : ""}>5 segundos</option>
          <option value="8" ${signal.duration == 8 ? "selected" : ""}>8 segundos</option>
        </select>
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
  if (!currentPeriod || !schedule[currentPeriod]) {
    console.error("Período atual não definido ou inválido.");
    return; // Sai da função se currentPeriod não estiver definido
  }

  const newSignal = {
    time: "00:00",
    name: "Novo Sinal",
    music: "musica1.mp3",
    duration: 5,
  };

  schedule[currentPeriod].push(newSignal);
  renderConfigForm();
  document.querySelector("#periodConfig").lastElementChild.scrollIntoView();
}

// Salvar configurações
function saveConfiguration() {
  fetch("https://sinal.onrender.com/api/schedule", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(schedule),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erro ao salvar horários: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Horários salvos com sucesso:", data);
      renderScheduleTable(); // Atualiza a tabela após salvar
      document.getElementById("configModal").classList.add("hidden");
    })
    .catch((error) => {
      console.error("Erro ao salvar horários:", error);
    });
}

// Inicializar aplicação
function initApp() {
  loadSchedule();

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

  // Definir currentPeriod ao clicar nos botões de período
  document.querySelectorAll('.period-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      currentPeriod = e.target.dataset.period; // Define o período atual
      renderConfigForm(); // Renderiza o formulário de configuração para o período selecionado
    });
  });

  // Excluir horário da TABELA principal
  document.getElementById("scheduleTable").addEventListener("click", (e) => {
    if (e.target.closest(".delete-btn")) {
      const index = e.target.closest(".delete-btn").dataset.index;
      const period = e.target.closest("tr").querySelector(".edit-btn").dataset.period;
      if (schedule[period]) {
        const timeToDelete = schedule[period][index].time; // Obtém o horário a ser excluído
        deleteTime(period, timeToDelete); // Chama a função de exclusão
      }
    }
  });

  // Eventos no formulário de configuração
  document.getElementById("periodConfig").addEventListener("click", (e) => {
    const target = e.target.closest("button");

    if (target && target.classList.contains("edit-btn")) {
      const index = target.dataset.index;
      const row = target.closest(".bg-gray-50");
      if (row) {
        const time = row.querySelector(".time-input").value;
        const name = row.querySelector(".name-input").value;
        const music = row.querySelector(".music-select").value;
        const duration = parseInt(row.querySelector(".duration-select").value);

        schedule[currentPeriod][index] = { time, name, music, duration };
        saveConfiguration();
      }
    }

    if (target && target.classList.contains("delete-btn")) {
      const index = target.dataset.index;
      schedule[currentPeriod].splice(index, 1);
      saveConfiguration();
      renderConfigForm(); // Re-renderiza após excluir
    }
  });

  // Atualização ao digitar (sem clicar no botão salvar)
  document.getElementById("periodConfig").addEventListener("change", (e) => {
    const row = e.target.closest(".bg-gray-50");
    if (row) {
      const index = Array.from(row.parentNode.children).indexOf(row);
      const time = row.querySelector(".time-input").value;
      const name = row.querySelector(".name-input").value;
      const music = row.querySelector(".music-select").value;
      const duration = parseInt(row.querySelector(".duration-select").value);

      schedule[currentPeriod][index] = { time, name, music, duration };
    }
  });
}

// Função para excluir horário
function deleteTime(period, time) {
  fetch(`https://sinal.onrender.com/api/schedule/${period}/${time}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erro ao excluir horário: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data.message);
      loadSchedule(); // Recarrega a tabela após a exclusão
    })
    .catch((error) => {
      console.error("Erro ao excluir horário:", error);
    });
}

// Iniciar quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", initApp);


function setActive(clickedBtn) {
    // Remove estilo ativo de todos os botões
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.remove('bg-blue-700', 'text-white', 'shadow-lg');
      btn.classList.add('bg-gray-200', 'text-gray-700');
    });

    // Aplica estilo ativo no botão clicado
    clickedBtn.classList.remove('bg-gray-200', 'text-gray-700');
    clickedBtn.classList.add('bg-blue-700', 'text-white', 'shadow-lg');
}