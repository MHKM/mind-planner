import template from "./items.html?raw";
import "./items.css";
import { showToast } from "../../utils/toast.js";

export function renderItemsScreen(root, { goal, items = [], onBack, onNext, hasExistingEdges = false }) {
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

  // Mostrar aviso si hay dependencias existentes
  if (hasExistingEdges) {
    showToast(
      "Ya has definido dependencias entre tareas. Si añades o eliminas tareas, se borrarán las dependencias afectadas.",
      { type: 'warning', duration: 5000 }
    );
  }

  renderList();
  labelInput.focus();

  root.querySelector("#add-form").addEventListener("submit", (e) => {
    e.preventDefault();

    if (items.length >= 10) {
      showToast("Puedes añadir como máximo 10 tareas.", { type: 'warning' });
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
      showToast("Añade al menos 5 tareas para poder generar el plan.", { type: 'warning' });
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
