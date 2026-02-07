export function allPairs(ids) {
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  return pairs;
}

export function edgeExists(edges, from, to) {
  return edges.some((e) => e.from === from && e.to === to);
}