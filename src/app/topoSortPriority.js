export function topoSortPriority(items, edges) {
  const ids = items.map((i) => i.id);

  const adj = new Map(ids.map((id) => [id, []]));
  const indeg = new Map(ids.map((id) => [id, 0]));
  const outdeg = new Map(ids.map((id) => [id, 0]));
  const labelById = new Map(items.map((it) => [it.id, it.label ?? it.id]));

  for (const e of edges) {
    if (!e.from || !e.to) continue;

    adj.get(e.from).push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    outdeg.set(e.from, (outdeg.get(e.from) ?? 0) + 1);
  }

  const pickNext = (available) => {
    // Elegimos el de mayor out-degree (más dependientes)
    available.sort((a, b) => {
      const da = outdeg.get(a) ?? 0;
      const db = outdeg.get(b) ?? 0;
      if (db !== da) return db - da;
      return String(labelById.get(a)).localeCompare(String(labelById.get(b)));
    });
    return available.shift();
  };

  const available = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const order = [];

  while (available.length) {
    const u = pickNext(available);
    order.push(u);

    for (const v of adj.get(u) ?? []) {
      indeg.set(v, indeg.get(v) - 1);
      if (indeg.get(v) === 0) available.push(v);
    }
  }

  if (order.length !== ids.length) {
    const cycleNodes = ids.filter((id) => (indeg.get(id) ?? 0) > 0);
    return { ok: false, order: [], cycleNodes };
  }

  return { ok: true, order, cycleNodes: [] };
}