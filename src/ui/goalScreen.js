export function renderGoalScreen(root, { initialValue = "", onSubmit }) {
  root.innerHTML = `
    <main class="container">
      <h1>Define tu objetivo</h1>
      <p>Dinos qué quieres conseguir. A partir de esto, te ayudaremos a crear un plan paso a paso.</p>

      <form id="goal-form" class="card">
        <label for="goal-input">¿Qué quieres lograr?</label>
        <input
          id="goal-input"
          name="goal"
          type="text"
          placeholder="Ej: Lanzar una web personal en un mes"
          value="${escapeHtml(initialValue)}"
          autocomplete="off"
          required
        />
        <button type="submit">Crear plan</button>
      </form>

      <small class="hint">Cuanto más claro sea el objetivo, mejor será el plan.</small>
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