import cytoscape from "cytoscape";
import { allPairs, edgeExists } from "../app/pairs.js";
import { computePlanLevels } from "../app/planLevels.js";

export function renderGraphScreen(root, { goal, items, edges, onBack }) {
  const idToItem = new Map(items.map((it) => [it.id, it]));
  const ids = items.map((it) => it.id);
  const pairs = allPairs(ids);

  let pairIndex = findNextPairIndex(pairs, edges);

  root.innerHTML = `
    <main class="container">
      <h1>Planificador (MVP)</h1>

      <section class="card">
        <div class="muted">Objetivo</div>
        <div class="goal">${escapeHtml(goal || "—")}</div>
      </section>

      <section class="card">
        <div class="graph-header">
          <h2 style="margin:0">Grafo de dependencias</h2>
          <button id="back-btn" type="button" class="secondary">Volver</button>
        </div>

        <div class="two-col">
          <div>
            <div id="cy" class="cy-container"></div>
          </div>

          <div class="qa">
            <h3 style="margin-top:0">Paso 3: Dependencias</h3>
            <p class="muted">Responde para crear arcos (flechas). Se dibujan al instante.</p>

            <div class="qa-card">
              <div class="muted">Progreso</div>
              <div id="progress" class="progress"></div>

              <div id="question" class="question"></div>

              <div class="actions-col">
                <button id="a-dep-b" type="button"></button>
                <button id="b-dep-a" type="button"></button>
                <button id="none" type="button" class="secondary">No hay dependencia</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="graph-header">
          <h2 style="margin:0">Plan por olas (paralelo)</h2>
          <button id="gen-plan" type="button">Generar plan</button>
        </div>
        <p class="muted" style="margin-top:8px">
          Cada columna es una <strong>ola</strong>. Los elementos dentro de la misma ola pueden ejecutarse en cualquier orden (o en paralelo).
        </p>

        <div id="planCy" class="cy-plan"></div>
        <div id="plan-msg" class="muted small" style="margin-top:10px">Aún no generado.</div>
      </section>
    </main>
  `;

  root.querySelector("#back-btn").addEventListener("click", onBack);

  // ===== Cytoscape: grafo principal =====
  const mainElements = [
    ...items.map((it) => ({
      data: { id: it.id, label: it.label, description: it.description },
    })),
    ...edges
      .filter((e) => e.from && e.to)
      .map((e) => ({
        data: { id: `${e.from}_${e.to}`, source: e.from, target: e.to },
      })),
  ];

  const cy = cytoscape({
    container: root.querySelector("#cy"),
    elements: mainElements,
    layout: { name: "circle" },
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#ffffff",
          "border-width": 2,
          "border-color": "#d0d4dd",
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 12,
          color: "#111",
          width: 52,
          height: 52,
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#999",
          "target-arrow-color": "#999",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
        },
      },
      { selector: ".focus", style: { "border-color": "#1589ee", "border-width": 4 } },
      { selector: ".focusEdge", style: { "line-color": "#1589ee", "target-arrow-color": "#1589ee", width: 3 } },
      { selector: ".cycle", style: { "border-color": "#d93025", "border-width": 5 } },
    ],
  });

  // ===== Cytoscape: plan por olas =====
  const planCy = cytoscape({
    container: root.querySelector("#planCy"),
    elements: [],
    layout: { name: "preset" }, // posiciones manuales
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: 160,
          height: 48,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 12,
          color: "#111",
          "background-color": "#ffffff",
          "border-width": 2,
          "border-color": "#d0d4dd",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#999",
          "target-arrow-color": "#999",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
        },
      },
      { selector: ".cycle", style: { "border-color": "#d93025", "border-width": 4 } },
      { selector: ".waveLabel", style: { "font-size": 11, color: "#555" } },
    ],
  });

  const progressEl = root.querySelector("#progress");
  const questionEl = root.querySelector("#question");
  const planMsgEl = root.querySelector("#plan-msg");

  const btnAdepB = root.querySelector("#a-dep-b");
  const btnBdepA = root.querySelector("#b-dep-a");
  const btnNone = root.querySelector("#none");
  const btnGenPlan = root.querySelector("#gen-plan");

  btnGenPlan.addEventListener("click", handleGeneratePlan);

  function refreshQA() {
    const decided = countDecidedPairs(pairs, edges);
    progressEl.textContent = `${decided} / ${pairs.length} pares`;

    if (pairIndex >= pairs.length) {
      questionEl.innerHTML = `<strong>¡Listo!</strong><br/>Ya has respondido todos los pares.`;
      btnAdepB.disabled = true;
      btnBdepA.disabled = true;
      btnNone.disabled = true;
      cy.nodes().removeClass("focus");
      cy.edges().removeClass("focusEdge");
      return;
    }

    const [a, b] = pairs[pairIndex];
    const A = idToItem.get(a);
    const B = idToItem.get(b);

    questionEl.innerHTML = `
      <div class="muted">Pregunta</div>
      <div><strong>${escapeHtml(A.label)}</strong> y <strong>${escapeHtml(B.label)}</strong></div>
      <div class="muted small" style="margin-top:6px">¿Cuál depende de cuál?</div>
    `;

    btnAdepB.textContent = `${A.label} depende de ${B.label}`;
    btnBdepA.textContent = `${B.label} depende de ${A.label}`;

    cy.nodes().removeClass("focus");
    cy.getElementById(a).addClass("focus");
    cy.getElementById(b).addClass("focus");
    cy.edges().removeClass("focusEdge");
  }

  function addEdge(from, to) {
    if (edgeExists(edges, from, to)) return;

    edges.push({ from, to });

    cy.add({
      data: { id: `${from}_${to}`, source: from, target: to },
    });

    cy.edges().removeClass("focusEdge");
    cy.getElementById(`${from}_${to}`).addClass("focusEdge");

    // invalida el plan anterior
    planCy.elements().remove();
    planMsgEl.textContent = "Aún no generado.";
    cy.nodes().removeClass("cycle");
  }

  btnAdepB.addEventListener("click", () => {
    const [a, b] = pairs[pairIndex];
    addEdge(b, a);
    pairIndex = findNextPairIndex(pairs, edges);
    refreshQA();
  });

  btnBdepA.addEventListener("click", () => {
    const [a, b] = pairs[pairIndex];
    addEdge(a, b);
    pairIndex = findNextPairIndex(pairs, edges);
    refreshQA();
  });

  btnNone.addEventListener("click", () => {
    markPairAsNone(pairs[pairIndex], edges);
    pairIndex = findNextPairIndex(pairs, edges);
    refreshQA();
  });

  function handleGeneratePlan() {
    cy.nodes().removeClass("cycle");
    planCy.elements().remove();
    planMsgEl.textContent = "";

    const res = computePlanLevels(items, edges);

    if (!res.ok) {
      res.cycleNodes.forEach((id) => cy.getElementById(id).addClass("cycle"));
      planMsgEl.innerHTML =
        `<span style="color:#d93025"><strong>Hay un ciclo de dependencias</strong></span>. ` +
        `Revisa los nodos en rojo en el grafo superior.`;
      return;
    }

    // ---- Layout manual por olas (columnas) ----
    const colX = 140;     // inicio X
    const colGap = 240;   // separación entre olas (columnas)
    const rowY = 80;      // inicio Y
    const rowGap = 84;    // separación entre nodos dentro de ola (filas)

    // construye nodos plan con posición (preset)
    const planNodes = [];
    const nodeIdMap = new Map(); // originalId -> planNodeId

    res.levels.forEach((levelIds, waveIdx) => {
      levelIds.forEach((id, rowIdx) => {
        const pid = `p_${id}`;
        nodeIdMap.set(id, pid);
        planNodes.push({
          data: { id: pid, label: idToItem.get(id)?.label ?? id, wave: waveIdx + 1 },
          position: {
            x: colX + waveIdx * colGap,
            y: rowY + rowIdx * rowGap,
          },
          locked: true,
        });
      });
    });

    // edges del plan: dependencias reales, pero pintadas entre nodos del plan
    const planEdges = edges
      .filter((e) => e.from && e.to)
      .map((e, i) => ({
        data: {
          id: `pe_${i}_${e.from}_${e.to}`,
          source: nodeIdMap.get(e.from),
          target: nodeIdMap.get(e.to),
        },
      }))
      .filter((e) => e.data.source && e.data.target);

    planCy.add([...planNodes, ...planEdges]);
    planCy.fit(undefined, 30);

    planMsgEl.innerHTML = `<strong>Plan generado:</strong> ${res.levels.length} olas, ${res.order.length} tareas.`;
  }

  refreshQA();
}

// --- helpers "no hay dependencia" ---
function markPairAsNone([a, b], edges) {
  const id = noneId(a, b);
  if (edges.some((e) => e.noneId === id)) return;
  edges.push({ noneId: id, from: null, to: null });
}
function noneId(a, b) {
  return [a, b].sort().join("__none__");
}

// --- decidir siguiente par ---
function findNextPairIndex(pairs, edges) {
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    const decided =
      edgeExists(edges, a, b) ||
      edgeExists(edges, b, a) ||
      edges.some((e) => e.noneId === noneId(a, b));
    if (!decided) return i;
  }
  return pairs.length;
}

function countDecidedPairs(pairs, edges) {
  let count = 0;
  for (const [a, b] of pairs) {
    const decided =
      edgeExists(edges, a, b) ||
      edgeExists(edges, b, a) ||
      edges.some((e) => e.noneId === noneId(a, b));
    if (decided) count++;
  }
  return count;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}