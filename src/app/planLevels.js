export function computePlanLevels(items, edges) {
  const ids = items.map((i) => i.id);

  const adj = new Map(ids.map((id) => [id, []]));
  const indeg = new Map(ids.map((id) => [id, 0]));

  for (const e of edges) {
    if (!e.from || !e.to) continue;
    adj.get(e.from).push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  // Ola 1: todos los de indegree 0
  let frontier = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const levels = [];
  let visitedCount = 0;

  while (frontier.length) {
    // Para estabilidad visual (misma ola ordenada por label si te apetece)
    levels.push([...frontier]);
    visitedCount += frontier.length;

    const next = [];
    for (const u of frontier) {
      for (const v of adj.get(u) ?? []) {
        indeg.set(v, indeg.get(v) - 1);
        if (indeg.get(v) === 0) next.push(v);
      }
    }
    frontier = next;
  }

  if (visitedCount !== ids.length) {
    const cycleNodes = ids.filter((id) => (indeg.get(id) ?? 0) > 0);
    return { ok: false, levels: [], order: [], cycleNodes };
  }

  const order = levels.flat();
  return { ok: true, levels, order, cycleNodes: [] };
}