let padron = null;
const form = document.querySelector("#consulta-form");
const input = document.querySelector("#cedula");
const button = document.querySelector("#consultar");
const message = document.querySelector("#message");
const installButton = document.querySelector("#install-app");
const shareWhatsapp = document.querySelector("#share-whatsapp");
let installPrompt = null;
let lastConsultation = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

async function loadPadron() {
  if (padron) return padron;
  const response = await fetch("padron.json");
  if (!response.ok) throw new Error("No se pudo cargar el padrón");
  const records = await response.json();
  padron = new Map(records.map(record => [String(record.cedula), record]));
  return padron;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const cedula = input.value.replace(/\D/g, "");
  if (cedula.length < 4) {
    message.innerHTML = '<div class="message error">Ingresá un número de cédula válido.</div>';
    return;
  }

  button.disabled = true;
  button.textContent = "Consultando…";
  message.innerHTML = "";

  try {
    const records = await loadPadron();
    const result = records.get(cedula);
    if (result) {
      lastConsultation = result;
      message.innerHTML = `<div class="result found">
        <div class="status-icon">✓</div>
        <div><p>HABILITADO/A PARA VOTAR</p><h3>${escapeHtml(result.name)}</h3>
        <dl><div><dt>Cédula</dt><dd>${escapeHtml(result.cedula)}</dd></div>
        <div><dt>Local</dt><dd>${escapeHtml(result.local)}</dd></div></dl></div>
      </div>`;
    } else {
      lastConsultation = null;
      message.innerHTML = `<div class="result not-found">
        <div class="status-icon">!</div>
        <div><p>RESULTADO DE LA CONSULTA</p>
        <h3>No se encuentra habilitado para votar en Arroyos y Esteros.</h3>
        <span>Verificá que el número de cédula ingresado sea correcto.</span></div>
      </div>`;
    }
  } catch {
    message.innerHTML = '<div class="message error">No pudimos realizar la consulta. Intentá nuevamente.</div>';
  } finally {
    button.disabled = false;
    button.textContent = "Consultar";
  }
});

input.addEventListener("input", () => {
  input.value = input.value.replace(/[^\d.]/g, "");
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.removeAttribute("hidden");
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(isIos
      ? "Para instalarla: tocá Compartir en Safari y elegí ‘Agregar a pantalla de inicio’."
      : "Para instalarla, abrí el menú de tu navegador y elegí ‘Instalar aplicación’ o ‘Agregar a pantalla de inicio’."
    );
    return;
  }
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
});

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  context.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function wrapText(context, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const trial = line ? `${line} ${word}` : word;
    if (context.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  });
  if (line) lines.push(line);
  return lines;
}

async function createReportImage(record) {
  const width = 900;
  const photoHeight = 990;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 1510;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, canvas.height);
  const candidateImage = await loadImage("lazarito-principal.jpeg");
  context.save();
  context.beginPath();
  context.rect(0, 0, width, photoHeight);
  context.clip();
  drawCover(context, candidateImage, 0, 0, width, photoHeight);
  context.restore();

  const panelY = photoHeight + 34;
  context.fillStyle = "#f1fbf4";
  context.fillRect(0, panelY, width, canvas.height - panelY);
  context.fillStyle = "#d9081a";
  context.fillRect(0, panelY, 14, canvas.height - panelY);
  context.fillStyle = "#12344d";
  context.font = "700 28px Arial";
  context.fillText("CONSULTA DE LOCAL DE VOTACIÓN", 48, panelY + 59);
  context.fillStyle = "#168044";
  context.font = "700 22px Arial";
  context.fillText("REGISTRO HABILITADO PARA VOTAR", 48, panelY + 96);

  const detailsTop = panelY + 124;
  const detailsHeight = canvas.height - detailsTop - 38;
  context.fillStyle = "#ffffff";
  context.fillRect(42, detailsTop, width - 82, detailsHeight);
  context.strokeStyle = "#cbe6ce";
  context.lineWidth = 2;
  context.strokeRect(42, detailsTop, width - 82, detailsHeight);

  const fields = [
    ["CÉDULA DE IDENTIDAD", record.cedula],
    ["NOMBRE Y APELLIDO", record.name],
    ["LOCAL DE VOTACIÓN", record.local]
  ];
  let y = detailsTop + 62;
  fields.forEach(([label, value]) => {
    context.font = "700 19px Arial";
    context.fillStyle = "#64748b";
    context.fillText(label.toUpperCase(), 70, y);
    context.font = "700 30px Arial";
    context.fillStyle = "#12344d";
    const lines = wrapText(context, value, 735);
    lines.forEach((line, index) => context.fillText(line, 70, y + 38 + index * 38));
    y += Math.max(90, lines.length * 38 + 57);
  });

  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

shareWhatsapp.addEventListener("click", async () => {
  if (!lastConsultation) {
    alert("Primero realizá una consulta. Luego el botón enviará el reporte con la cédula, el nombre y el local de votación.");
    return;
  }

  try {
    const report = await createReportImage(lastConsultation);
    const file = new File([report], `consulta-${lastConsultation.cedula}.png`, { type: "image/png" });
    const title = "Consulta de local de votación";
    const shareData = { title, text: "Reporte de consulta de local de votación.", files: [file] };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}`;
    const text = `CONSULTA DE LOCAL DE VOTACIÓN\n\nRegistro habilitado para votar\n\nCédula de identidad: ${lastConsultation.cedula}\nNombre y apellido: ${lastConsultation.name}\nLocal de votación: ${lastConsultation.local}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  } catch {
    alert("No se pudo preparar el reporte. Intentá nuevamente.");
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
