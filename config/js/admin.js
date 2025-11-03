// ==============================
// 🧭 ADMIN DE CONFIGURAÇÃO DOS SINAIS
// ==============================

let schedule = {};
let currentPeriod = null;

// ==============================
// 🔹 Carregar horários da API
// ==============================
async function loadSchedule() {
  try {
    const response = await fetch("https://sinal.onrender.com/api/schedule");
    if (!response.ok) throw new Error("Erro ao carregar horários");
    schedule = await response.json();

    renderScheduleTable();
    renderConfigForm();
  } catch (error) {
    console.error("❌ Erro ao carregar horários:", error);
    schedule = {};
    renderScheduleTable();
  }
}

// ==============================
// 📊 Renderizar tabela principal
// ==============================
function renderScheduleTable() {
  const tableBody = document.getElementById("scheduleTable");
  tableBody.innerHTML = "";

  const periods = ["morning", "afternoon", "afternoonFriday"];
  const musicLabels = {
    "musica1.mp3": "Tu me Sondas",
    "musica2.mp3": "Eu Amo a Minha Escola",
    "musica3.mp3": "My Lighthouse",
    "musica4.mp3": "Amor Teimoso"
  };

  periods.forEach((period) => {
    const signals = schedule[period] || [];
    signals.forEach((signal, index) => {
      const row = document.createElement("tr");
      row.className = index % 2 === 0 ? "bg-gray-50" : "bg-white";

      const musicName = musicLabels[signal.music] || signal.music || "Sino padrão";
      const durationText = signal.duration ? `${signal.duration}s` : "8s";

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
// ⚙️ Formulário de configuração
// ==============================
function renderConfigForm() {
  const periodConfig = document.getElementById("periodConfig");
  periodConfig.innerHTML = "";

  const currentSignals = schedule[currentPeriod] || [];

  if (currentSignals.length === 0) {
    periodConfig.innerHTML = `<p class="text-gray-500">Nenhum horário cadastrado para este período.</p>`;
    return;
  }

  currentSignals.forEach((signal, index) => {
    const div = document.createElement("div");
    div.className =
      "bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center";

    div.innerHTML = `
      <div class="sm:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Horário</label>
        <input type="time" value="${signal.time}" class="time-input w-full px-3 py-2 border rounded-md">
      </div>

      <div class="sm:col-span-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Sinal</label>
        <input type="text" value="${signal.name}" class="name-input w-full px-3 py-2 border rounded-md">
      </div>

      <div class="sm:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Música</label>
        <select class="music-select w-full px-3 py-2 border rounded-md">
          <option value="musica1.mp3" ${signal.music === "musica1.mp3" ? "selected" : ""}>Tu me Sondas</option>
          <option value="musica2.mp3" ${signal.music === "musica2.mp3" ? "selected" : ""}>Eu Amo a Minha Escola</option>
          <option value="musica3.mp3" ${signal.music === "musica3.mp3" ? "selected" : ""}>My Lighthouse</option>
          <option value="musica4.mp3" ${signal.music === "musica4.mp3" ? "selected" : ""}>Amor Teimoso</option>
        </select>
      </div>

      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Duração</label>
        <select class="duration-select w-full px-3 py-2 border rounded-md">
          <option value="5" ${signal.duration == 5 ? "selected" : ""}>5 segundos</option>
          <option value="8" ${signal.duration == 8 ? "selected" : ""}>8 segundos</option>
        </select>
      </div>

      <div class="sm:col-span-2 flex space-x-2 justify-end">
        <button class="edit-btn px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700" data-index="${index}">
          <i class="fas fa-save"></i>
        </button>
        <button class="delete-btn px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    periodConfig.appendChild(div);
  });
}

// ==============================
// ➕ Adicionar novo sinal
// ==============================
function addNewTime() {
  if (!currentPeriod || !schedule[currentPeriod]) return;

  const novoSinal = {
    time: "00:00",
    name: "Novo Sinal",
    music: "musica1.mp3",
    duration: 8
  };

  schedule[currentPeriod].push(novoSinal);
  renderConfigForm();
}

// ==============================
// 💾 Salvar configurações na API
// ==============================
async function saveConfiguration() {
  try {
    const res = await fetch("https://sinal.onrender.com/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });

    if (!res.ok) throw new Error("Erro ao salvar");
    await res.json();

    console.log("✅ Horários atualizados com sucesso!");
    renderScheduleTable();
    document.getElementById("configModal").classList.add("hidden");
  } catch (err) {
    console.error("❌ Erro ao salvar:", err);
  }
}

// ==============================
// 🗑️ Excluir sinal
// ==============================
async function deleteSignal(index) {
  schedule[currentPeriod].splice(index, 1);
  await saveConfiguration();
  renderConfigForm();
}

// ==============================
// 🚀 Inicialização
// ==============================
function initApp() {
  loadSchedule();

  // Botões principais
  document.getElementById("configBtn").addEventListener("click", () => {
    document.getElementById("configModal").classList.remove("hidden");
    renderConfigForm();
  });

  document.getElementById("closeConfigBtn").addEventListener("click", () => {
    document.getElementById("configModal").classList.add("hidden");
  });

  document.getElementById("saveConfigBtn").addEventListener("click", saveConfiguration);
  document.getElementById("addTimeBtn").addEventListener("click", addNewTime);

  // Selecionar período
  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      currentPeriod = e.target.dataset.period;
      setActive(btn);
      renderConfigForm();
    });
  });

  // Eventos dentro do formulário
  document.getElementById("periodConfig").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const index = btn.dataset.index;

    if (btn.classList.contains("edit-btn")) {
      const row = btn.closest("div.bg-gray-50");
      const time = row.querySelector(".time-input").value;
      const name = row.querySelector(".name-input").value;
      const music = row.querySelector(".music-select").value;
      const duration = parseInt(row.querySelector(".duration-select").value);

      schedule[currentPeriod][index] = { time, name, music, duration };
      saveConfiguration();
    }

    if (btn.classList.contains("delete-btn")) {
      deleteSignal(index);
    }
  });
}

// ==============================
// 🧩 Ativar botão selecionado
// ==============================
function setActive(clickedBtn) {
  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.classList.remove("bg-blue-700", "text-white", "shadow-lg");
    btn.classList.add("bg-gray-200", "text-gray-700");
  });

  clickedBtn.classList.remove("bg-gray-200", "text-gray-700");
  clickedBtn.classList.add("bg-blue-700", "text-white", "shadow-lg");
}


 const API_URL = "https://sinal.onrender.com/api/schedule";
      const modal = document.getElementById("configModal");
      const modalContent = document.getElementById("modalContent");

      // Atualiza relógio
      function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        document.getElementById("currentTime").textContent = `${h}:${m}:${s}`;
      }
      setInterval(updateClock, 1000);
      updateClock();

      // Fade audio preview
      function playPreviewAudio(music, duration = 10) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioElement = new Audio(`./assets/audio/${music}`);
          const source = audioContext.createMediaElementSource(audioElement);
          const gainNode = audioContext.createGain();
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);

          const now = audioContext.currentTime;
          const fadeIn = 0.5;
          const fadeOut = 0.5;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.5, now + fadeIn);
          gainNode.gain.setValueAtTime(0.5, now + duration);
          gainNode.gain.linearRampToValueAtTime(0, now + duration + fadeOut);

          audioElement.play();
          setTimeout(() => {
            audioElement.pause();
            source.disconnect();
            gainNode.disconnect();
          }, (duration + fadeIn + fadeOut) * 1000);
        } catch (e) {
          alert("Erro ao tocar o áudio de prévia.");
          console.error(e);
        }
      }

      // Preview button
      document.getElementById("previewBtn").onclick = () => {
        const music = document.getElementById("musicSelect").value;
        const duration = parseInt(document.getElementById("durationSelect").value);
        playPreviewAudio(music, duration);
      };

      // Carregar horários
      async function loadSchedule() {
        const tbody = document.getElementById("scheduleTable");
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-500">Carregando...</td></tr>`;

        try {
          const res = await fetch(API_URL);
          const data = await res.json();
          tbody.innerHTML = "";

          const periods = {
            morning: "Manhã",
            afternoon: "Tarde",
            afternoonFriday: "Tarde de Sexta",
          };

          Object.keys(periods).forEach((key) => {
            (data[key] || []).forEach((s) => {
              const tr = document.createElement("tr");
              tr.classList.add("hover:bg-gray-50", "transition");
              tr.innerHTML = `
                <td class="py-3 px-4">${periods[key]}</td>
                <td class="py-3 px-4">${s.time}</td>
                <td class="py-3 px-4">${s.name}</td>
                <td class="py-3 px-4">${s.music || "sino.mp3"}</td>
                <td class="py-3 px-4">${s.duration || 8}s</td>
                <td class="py-3 px-4 text-center">
                  <button class="text-red-600 hover:text-red-800 transition" onclick="deleteSignal('${key}','${s.time}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>`;
              tbody.appendChild(tr);
            });
          });
        } catch {
          tbody.innerHTML = `<tr><td colspan="6" class="text-center text-red-600 py-6">Erro ao carregar horários</td></tr>`;
        }
      }

      // Deletar sinal
      async function deleteSignal(period, time) {
        if (!confirm(`Remover o sinal das ${time}?`)) return;
        await fetch(`${API_URL}/${period}/${time}`, { method: "DELETE" });
        loadSchedule();
      }

      // Abrir modal
      document.getElementById("configBtn").onclick = () => {
        modal.classList.remove("hidden");
        setTimeout(() => modalContent.classList.remove("scale-95", "opacity-0"), 50);
      };

      // Fechar modal
      const closeModal = () => {
        modalContent.classList.add("scale-95", "opacity-0");
        setTimeout(() => modal.classList.add("hidden"), 200);
      };
      document.getElementById("closeConfigBtn").onclick = closeModal;
      document.getElementById("cancelConfigBtn").onclick = closeModal;

      // Salvar novo horário
      document.getElementById("scheduleForm").onsubmit = async (e) => {
        e.preventDefault();
        const period = document.getElementById("periodSelect").value;
        const time = document.getElementById("timeInput").value;
        const name = document.getElementById("nameInput").value;
        const music = document.getElementById("musicSelect").value;
        const duration = parseInt(document.getElementById("durationSelect").value);

        const res = await fetch(API_URL);
        const data = await res.json();
        data[period] = data[period] || [];
        data[period].push({ time, name, music, duration });

        await fetch(API_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        closeModal();
        loadSchedule();
      };

      loadSchedule();

// ==============================
// DOM Loaded
// ==============================
document.addEventListener("DOMContentLoaded", initApp);
