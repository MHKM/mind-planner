
/**
 * Detecta ciclos en el grafo de dependencias y retorna información detallada
 * @param {Array} items - Array de items con id
 * @param {Array} edges - Array de edges con from/to
 * @returns {Object} { hasCycle, cycle, cycleEdges }
 */
export function detectCycle(items, edges) {
  const ids = items.map((i) => i.id);
  const adj = new Map(ids.map((id) => [id, []]));
  
  // Construir grafo de adyacencia
  for (const e of edges) {
    if (!e.from || !e.to) continue;
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }

  const visited = new Set();
  const recStack = new Set();
  const parent = new Map();
  let cycleStart = null;
  let cycleEnd = null;

  function dfs(node) {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node);
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        cycleStart = neighbor;
        cycleEnd = node;
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  // Buscar ciclo
  for (const id of ids) {
    if (!visited.has(id)) {
      if (dfs(id)) {
        break;
      }
    }
  }

  if (!cycleStart) {
    return { hasCycle: false, cycle: [], cycleEdges: [] };
  }

  // Reconstruir el ciclo
  const cycle = [cycleStart];
  let current = cycleEnd;
  
  while (current !== cycleStart) {
    cycle.push(current);
    current = parent.get(current);
    if (!current) break; // Seguridad
  }
  
  cycle.reverse();

  // Encontrar los edges que forman el ciclo
  const cycleEdges = [];
  for (let i = 0; i < cycle.length; i++) {
    const from = cycle[i];
    const to = cycle[(i + 1) % cycle.length];
    cycleEdges.push({ from, to });
  }

  return { hasCycle: true, cycle, cycleEdges };
}

/**
 * Encuentra qué preguntas están involucradas en el ciclo
 * @param {Array} cycleEdges - Edges que forman el ciclo
 * @param {Array} pairs - Todas las parejas de preguntas
 * @returns {Array} Índices de las preguntas involucradas
 */
export function findCycleQuestions(cycleEdges, pairs) {
  const questionIndices = new Set();
  
  for (const { from, to } of cycleEdges) {
    pairs.forEach(([a, b], idx) => {
      if ((a === from && b === to) || (a === to && b === from)) {
        questionIndices.add(idx);
      }
    });
  }
  
  return Array.from(questionIndices);
}
