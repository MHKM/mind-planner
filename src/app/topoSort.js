export function topoSort(items, edges) {
  const ids = items.map((i) => i.id);

  const adj = new Map(ids.map((id) => [id, []]));
  const indeg = new Map(ids.map((id) => [id, 0]));

  for (const e of edges) {
    if (!e.from || !e.to) continue; // ignora "no hay dependencia" y similares

    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);

    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  // cola de nodos sin dependencias
  const queue = [];
  for (const id of ids) {
    if ((indeg.get(id) ?? 0) === 0) queue.push(id);
  }

  const order = [];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);

    for (const v of adj.get(u) ?? []) {
      indeg.set(v, indeg.get(v) - 1);
      if (indeg.get(v) === 0) queue.push(v);
    }
  }

  if (order.length !== ids.length) {
    const cycleNodes = ids.filter((id) => (indeg.get(id) ?? 0) > 0);
    return { ok: false, order: [], cycleNodes };
  }

  return { ok: true, order, cycleNodes: [] };
}