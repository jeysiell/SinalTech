const API_URL = "https://sinal.onrender.com/api/schedule";

const modal = document.getElementById("configModal");
const modalContent = document.getElementById("modalContent");

// ======== Nomes amigáveis das músicas ========
const musicLabels = {
  "musica1.mp3": "Tu me Sondas",
  "musica2.mp3": "Eu Amo a Minha Escola",
  "musica3.mp3": "My Lighthouse",
  "musica4.mp3": "Amor Teimoso"
};

// ================= RELÓGIO =================
function updateClock() {
  const now = new Date();
  document.getElementById("currentTime").textContent =
    now.toLocaleTimeString("pt-BR");
}
setInterval(updateClock, 1000);
updateClock();

// ================= PRÉVIA DE ÁUDIO =================
let previewContext = null;
let previewSource = null;

async function playPreviewAudio(music, duration = 8) {
  try {
    if (!previewContext) {
      previewContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (previewContext.state === "suspended") {
      await previewContext.resume();
    }

    if (previewSource) {
      try { previewSource.stop(); } catch {}
      previewSource.disconnect();
      previewSource = null;
    }

    const audio = new Audio(`./assets/audio/${music}`);
    audio.preload = "auto";

    const source = previewContext.createMediaElementSource(audio);
    const gain = previewContext.createGain();

    source.connect(gain);
    gain.connect(previewContext.destination);

    previewSource = source;

    const now = previewContext.currentTime;
    const fade = 0.5;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + fade);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    await audio.play();

    setTimeout(() => {
      audio.pause();
      source.disconnect();
      gain.disconnect();
      previewSource = null;
    }, duration * 1000);

  } catch {
    alert("Erro ao tocar prévia.");
  }
}

document.getElementById("previewBtn").onclick = () => {
  const music = document.getElementById("musicSelect").value;
  const duration = parseInt(document.getElementById("durationSelect").value);
  playPreviewAudio(music, duration);
};

// ================= CARREGAR HORÁRIOS =================
async function loadSchedule() {
  const tbody = document.getElementById("scheduleTable");
  tbody.innerHTML =
    `<tr><td colspan="6" class="text-center py-6 text-gray-500">Carregando...</td></tr>`;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error();

    const data = await res.json();
    tbody.innerHTML = "";

    const periods = {
      morning: "Manhã",
      afternoon: "Tarde",
      afternoonFriday: "Tarde de Sexta",
    };

    Object.entries(periods).forEach(([key, label]) => {

      const list = (data[key] || []).sort((a, b) =>
        a.time.localeCompare(b.time)
      );

      list.forEach((s) => {
        const tr = document.createElement("tr");
        tr.classList.add("hover:bg-gray-50", "cursor-pointer");

        tr.innerHTML = `
          <td class="py-3 px-4">${label}</td>
          <td class="py-3 px-4">${s.time}</td>
          <td class="py-3 px-4">${s.name}</td>
          <td class="py-3 px-4">${musicLabels[s.music] || s.music}</td>
          <td class="py-3 px-4">${s.duration || 8}s</td>
          <td class="py-3 px-4 text-center">
            <button class="text-red-600 hover:text-red-800 transition"
              onclick="event.stopPropagation(); deleteSignal('${key}','${s.time}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;

        tr.onclick = () => openEditModal(key, s);
        tbody.appendChild(tr);
      });
    });

  } catch {
    tbody.innerHTML =
      `<tr><td colspan="6" class="text-center text-red-600 py-6">
        Erro ao carregar horários
      </td></tr>`;
  }
}

// ================= EDITAR =================
function openEditModal(period, signal) {
  document.getElementById("editMode").value = "true";
  document.getElementById("editPeriod").value = period;
  document.getElementById("editTimeOriginal").value = signal.time;

  document.getElementById("modalTitle").innerHTML =
    `<i class="fas fa-pen text-blue-600"></i> Editar Horário`;

  document.getElementById("periodSelect").value = period;
  document.getElementById("timeInput").value = signal.time;
  document.getElementById("nameInput").value = signal.name;
  document.getElementById("musicSelect").value = signal.music;
  document.getElementById("durationSelect").value = signal.duration;

  modal.classList.remove("hidden");
  setTimeout(() =>
    modalContent.classList.remove("scale-95", "opacity-0"), 50);
}

// ================= DELETAR =================
async function deleteSignal(period, time) {
  if (!confirm(`Remover o sinal das ${time}?`)) return;

  try {
    const res = await fetch(`${API_URL}/${period}/${time}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Erro ao remover.");
      return;
    }

    loadSchedule();
  } catch {
    alert("Erro ao conectar com o servidor.");
  }
}

// ================= MODAL =================
const closeModal = () => {
  modalContent.classList.add("scale-95", "opacity-0");
  setTimeout(() => modal.classList.add("hidden"), 200);
};

document.getElementById("closeConfigBtn").onclick = closeModal;
document.getElementById("cancelConfigBtn").onclick = closeModal;

document.getElementById("configBtn").onclick = () => {
  document.getElementById("editMode").value = "false";
  document.getElementById("modalTitle").innerHTML =
    `<i class="fas fa-plus text-blue-600"></i> Novo Horário`;

  document.getElementById("scheduleForm").reset();

  modal.classList.remove("hidden");
  setTimeout(() =>
    modalContent.classList.remove("scale-95", "opacity-0"), 50);
};

// ================= SALVAR =================
document.getElementById("scheduleForm").onsubmit = async (e) => {
  e.preventDefault();

  const isEdit = document.getElementById("editMode").value === "true";
  const period = document.getElementById("periodSelect").value;
  const time = document.getElementById("timeInput").value;
  const name = document.getElementById("nameInput").value;
  const music = document.getElementById("musicSelect").value;
  const duration = parseInt(document.getElementById("durationSelect").value);

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error();

    const data = await res.json();

    // ===== EDITANDO =====
    if (isEdit) {
      const editPeriod = document.getElementById("editPeriod").value;
      const editTimeOriginal =
        document.getElementById("editTimeOriginal").value;

      // Remove antigo
      data[editPeriod] = (data[editPeriod] || []).filter(
        (s) => s.time !== editTimeOriginal
      );
    }

    data[period] = data[period] || [];

    // ===== IMPEDIR DUPLICADO =====
    const exists = data[period].some((s) => s.time === time);
    if (exists) {
      alert("Já existe um sinal nesse horário.");
      return;
    }

    data[period].push({ time, name, music, duration });

    // ===== ORDENAR ANTES DE SALVAR =====
    Object.keys(data).forEach((p) => {
      data[p].sort((a, b) => a.time.localeCompare(b.time));
    });

    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    closeModal();
    loadSchedule();

  } catch {
    alert("Erro ao salvar.");
  }
};

loadSchedule();