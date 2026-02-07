export function renderItemsScreen(root, { goal, items = [], onBack, onNext }) {
  root.innerHTML = `
    <main class="container">
      <h1>Describe las tareas</h1>

      <section class="card">
        <div class="muted">Objetivo</div>
        <div class="goal">${escapeHtml(goal || "—")}</div>
      </section>

      <section class="card">
        <h2>Define entre 5 y 10 tareas</h2>
        <p class="muted">
          Escribe las tareas o pasos necesarios para lograr tu objetivo. Usa un nombre corto y, si quieres, añade una breve descripción.
        </p>

        <form id="add-form" class="stack">
          <input
            id="label-input"
            type="text"
            placeholder="Nombre de la tarea (ej: Diseñar UI, Preparar datos, Publicar)"
            maxlength="30"
            required
          />
          <textarea
            id="desc-input"
            placeholder="Descripción (opcional). Ej: qué incluye o qué significa “hecho”."
            rows="2"
          ></textarea>

          <button type="submit">Añadir tarea</button>
        </form>

        <div class="muted counter">${items.length} / 10</div>

        <ul id="items-list" class="list"></ul>

        <div class="actions">
          <button id="back-btn" type="button" class="secondary">Volver</button>
          <button id="next-btn" type="button">Continuar</button>
        </div>

        <small class="muted">
          Consejo: intenta que cada tarea sea accionable (algo que puedas marcar como “hecho”).
        </small>
      </section>
    </main>
  `;

  const labelInput = root.querySelector("#label-input");
  const descInput = root.querySelector("#desc-input");
  const listEl = root.querySelector("#items-list");
  const nextBtn = root.querySelector("#next-btn");
  const backBtn = root.querySelector("#back-btn");
  const counterEl = root.querySelector(".counter");

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