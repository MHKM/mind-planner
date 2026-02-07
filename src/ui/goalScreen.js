export function renderGoalScreen(root, { initialValue = "", onSubmit }) {
  root.innerHTML = `
    <main class="container">
      <h1>Planificador (MVP)</h1>
      <p>Escribe el objetivo que quieres resolver.</p>

      <form id="goal-form" class="card">
        <label for="goal-input">Objetivo</label>
        <input
          id="goal-input"
          name="goal"
          type="text"
          placeholder="Ej: Montar la app MVP del grafo"
          value="${escapeHtml(initialValue)}"
          autocomplete="off"
          required
        />
        <button type="submit">Continuar</button>
      </form>

      <small class="hint">Tip: sé específico (“hacer X en Y días”).</small>
    </main>
  `;

  const form = root.querySelector("#goal-form");
  const input = root.querySelector("#goal-input");

  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const goal = input.value;
    if (!goal || !goal.trim()) return;
    onSubmit(goal);
  });
}

// Evita romper el HTML si el usuario mete caracteres raros
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}