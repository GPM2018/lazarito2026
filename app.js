let padron = null;
const form = document.querySelector("#consulta-form");
const input = document.querySelector("#cedula");
const button = document.querySelector("#consultar");
const message = document.querySelector("#message");

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
      message.innerHTML = `<div class="result found">
        <div class="status-icon">✓</div>
        <div><p>HABILITADO/A PARA VOTAR</p><h3>${escapeHtml(result.name)}</h3>
        <dl><div><dt>Cédula</dt><dd>${escapeHtml(result.cedula)}</dd></div>
        <div><dt>Local</dt><dd>${escapeHtml(result.local)}</dd></div></dl></div>
      </div>`;
    } else {
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
