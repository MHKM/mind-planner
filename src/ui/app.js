import { renderGoal } from "./goal/goal.js";
import { renderItemsScreen } from "./items/items.js";
import { renderGraphScreen } from "./graph/graph.js";
import { state } from "../app/state.js";
import { showToast } from "../utils/toast.js";

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
      // Guardar snapshot de IDs actuales para detectar cambios
      const currentItemIds = new Set(state.items.map(item => item.id));
      const hasExistingEdges = state.edges.length > 0;
      
      renderItemsScreen(root, {
        goal: state.goal,
        items: state.items,
        hasExistingEdges,
        onBack: () => {
          state.goal = "";
          state.items = [];
          state.edges = [];
          renderApp(root);
        },
        onNext: (items) => {
          const newItemIds = new Set(items.map(item => item.id));
          
          // Detectar si hubo cambios en los items
          const itemsChanged = 
            items.length !== currentItemIds.size ||
            items.some(item => !currentItemIds.has(item.id));
          
          if (itemsChanged && state.edges.length > 0) {
            // Limpiar edges que apuntan a items que ya no existen
            const validEdges = state.edges.filter(edge => {
              // Mantener edges "none" (sin from/to)
              if (!edge.from && !edge.to) return true;
              // Eliminar edges que apuntan a items inexistentes
              return newItemIds.has(edge.from) && newItemIds.has(edge.to);
            });
            
            const removedCount = state.edges.length - validEdges.length;
            state.edges = validEdges;
            
            if (removedCount > 0) {
              showToast(
                `Se han eliminado ${removedCount} dependencia(s) porque las tareas asociadas fueron modificadas o eliminadas.`,
                { type: 'warning', duration: 4000 }
              );
            }
          }
          
          state.items = items;
          renderApp(root);
        },
      });
    },
  });
}