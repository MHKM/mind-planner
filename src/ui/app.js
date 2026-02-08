import { renderGoal } from "./goal/goal.js";
import { renderItemsScreen } from "./items/items.js";
import { renderGraphScreen } from "./graph/graph.js";
import { state } from "../app/state.js";

export function renderApp(root) {
  // Paso 1: objetivo
  if (!state.goal) {
    renderGoal(root, {
      initialValue: state.goal,
      onSubmit: (goal) => {
        state.goal = goal.trim();
        renderApp(root);
      },
    });
    return;
  }

  // Paso 2: items (mínimo 5)
  if (!state.items || state.items.length < 5) {
    renderItemsScreen(root, {
      goal: state.goal,
      items: state.items,
      onBack: () => {
        // volver a paso 1 sin borrar objetivo si quieres
        // si prefieres borrarlo, pon: state.goal = "";
        state.goal = "";
        state.items = [];
        state.edges = [];
        renderApp(root);
      },
      onNext: (items) => {
        state.items = items;
        renderApp(root);
      },
    });
    return;
  }

  // Paso visual: grafo
  renderGraphScreen(root, {
    goal: state.goal,
    items: state.items,
    edges: state.edges,
    onBack: () => {
      // volver a paso 2 manteniendo items
      state.items = state.items;
      // si quieres que al volver puedas editar con libertad:
      renderItemsScreen(root, {
        goal: state.goal,
        items: state.items,
        onBack: () => {
          state.goal = "";
          state.items = [];
          state.edges = [];
          renderApp(root);
        },
        onNext: (items) => {
          state.items = items;
          renderApp(root);
        },
      });
    },
  });
}