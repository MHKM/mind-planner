import template from "./items.html?raw";
import "./items.css";

export function renderItemsScreen(root, { goal, items = [], onBack, onNext }) {
  root.innerHTML = template;

  // Inyectar el objetivo de forma segura
  const goalText = root.querySelector("#goal-text");
  goalText.textContent = goal || "—";

  const labelInput = root.querySelector("#label-input");
  const descInput = root.querySelector("#desc-input");
  const listEl = root.querySelector("#items-list");
  const nextBtn = root.querySelector("#next-btn");
  const backBtn = root.querySelector("#back-btn");
  const counterEl = root.querySelector("#counter");

  renderList();
  labelInput.focus();

  root.querySelector("#add-form").addEventListener("submit", (e) => {
    e.preventDefault();

    if (items.length >= 10) {
      alert("Puedes añadir como máximo 10 tareas.");
      return;
    }

    const label = labelInput.value.trim();
    const description = descInput.value.trim();

    if (!label) return;

    items.push({
      id: createId(),
      label,
      description,
    });

    labelInput.value = "";
    descInput.value = "";
    labelInput.focus();
    renderList();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const idx = items.findIndex((x) => x.id === id);
    if (idx >= 0) items.splice(idx, 1);
    renderList();
  });

  backBtn.addEventListener("click", onBack);

  nextBtn.addEventListener("click", () => {
    if (items.length < 5) {
      alert("Añade al menos 5 tareas para poder generar el plan.");
      return;
    }
    onNext(items);
  });

  function renderList() {
    listEl.innerHTML = items
      .map(
        (it) => `
        <li class="list-item">
          <div>
            <strong>${escapeHtml(it.label)}</strong>
            ${
              it.description
                ? `<div class="muted small">${escapeHtml(it.description)}</div>`
                : ""
            }
          </div>
          <button
            class="icon secondary"
            type="button"
            data-action="remove"
            data-id="${it.id}"
            aria-label="Eliminar tarea"
            title="Eliminar"
          >✕</button>
        </li>
      `
      )
      .join("");

    counterEl.textContent = `${items.length} / 10`;
    nextBtn.disabled = items.length < 5;
    labelInput.disabled = items.length >= 10;
  }
}

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
