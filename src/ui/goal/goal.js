import template from "./goal.html?raw";
import "./goal.css";

export function renderGoal(root, { initialValue = "", onSubmit }) {
  root.innerHTML = template;

  const form = root.querySelector("#goal-form");
  const input = root.querySelector("#goal-input");

  // Inyectamos el valor inicial de forma segura
  input.value = initialValue ?? "";

  // UX: foco directo para empezar
  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const goal = input.value.trim();
    if (!goal) return;

    onSubmit(goal);
  });
}