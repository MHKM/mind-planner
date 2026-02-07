import cytoscape from "cytoscape";
import { allPairs, edgeExists } from "../app/pairs.js";
import { computePlanLevels } from "../app/planLevels.js";
import { topoSortPriority } from "../app/topoSortPriority.js";

export function renderGraphScreen(root, { goal, items, edges, onBack }) {
  const idToItem = new Map(items.map((it) => [it.id, it]));
  const ids = items.map((it) => it.id);
  const pairs = allPairs(ids);

  let pairIndex = findNextPairIndex(pairs, edges);

  root.innerHTML = `
    <main class="container">
      <h1>Define el orden de las tareas</h1>

      <section class="card">
        <div class="muted">Objetivo</div>
        <div class="goal">${escapeHtml(goal || "—")}</div>
      </section>

      <section class="card">
        <div class="graph-header">
          <h2 style="margin:0">Dependencias entre tareas</h2>
          <button id="back-btn" type="button" class="secondary">Volver</button>
        </div>

        <div class="two-col">
          <div>
            <div id="cy" class="cy-container"></div>
          </div>

          <div class="qa">
            <h3 style="margin-top:0">Define qué va antes</h3>
            <p class="muted">
              Para cada pareja de tareas, indica si una necesita que la otra esté hecha antes.
            </p>

            <div class="qa-card">
              <div class="muted">Progreso</div>
              <div id="progress" class="progress"></div>

              <div id="question" class="question"></div>

              <div class="actions-col">
                <button id="a-dep-b" type="button"></button>
                <button id="b-dep-a" type="button"></button>
                <button id="none" type="button" class="secondary">Son independientes</button>
              </div>

              <small class="muted small">
                Ejemplo: si “Publicar” necesita “Preparar” antes, entonces primero va “Preparar”.
              </small>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="graph-header">
          <h2 style="margin:0">Tu plan</h2>

          <div class="plan-controls">
            <div class="plan-select">
              <span class="plan-select__label muted small">Modo</span>
              <select id="plan-mode" class="plan-select__control" aria-label="Modo de plan">
                <option value="waves" selected>Paralelo (olas)</option>
                <option value="linear">Secuencia (una tras otra)</option>
              </select>
            </div>

            <button id="gen-plan" type="button">Generar plan</button>
          </div>
        </div>

        <p class="muted" style="margin-top:8px">
          En <strong>Secuencia</strong>, si hay varias tareas posibles a la vez, se prioriza la que desbloquea más tareas.
        </p>

        <div id="planCy" class="cy-plan"></div>
        <div id="plan-msg" class="muted small" style="margin-top:10px">Aún no has generado el plan.</div>
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

  // ===== Cytoscape: plan =====
  const planCy = cytoscape({
    container: root.querySelector("#planCy"),
    elements: [],
    layout: { name: "preset" },
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: 170,
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
    ],
  });

  const progressEl = root.querySelector("#progress");
  const questionEl = root.querySelector("#question");
  const planMsgEl = root.querySelector("#plan-msg");
  const planModeEl = root.querySelector("#plan-mode");

  const btnAdepB = root.querySelector("#a-dep-b");
  const btnBdepA = root.querySelector("#b-dep-a");
  const btnNone = root.querySelector("#none");
  const btnGenPlan = root.querySelector("#gen-plan");

  btnGenPlan.addEventListener("click", handleGeneratePlan);

  function refreshQA() {
    const decided = countDecidedPairs(pairs, edges);
    progressEl.textContent = `${decided} / ${pairs.length} parejas`;

    if (pairIndex >= pairs.length) {
      questionEl.innerHTML = `<strong>¡Listo!</strong><br/>Ya has respondido todas las parejas.`;
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
      <div class="muted small" style="margin-top:6px">¿Cuál necesita ir antes?</div>
    `;

    btnAdepB.textContent = `${A.label} necesita ${B.label} antes`;
    btnBdepA.textContent = `${B.label} necesita ${A.label} antes`;

    cy.nodes().removeClass("focus");
    cy.getElementById(a).addClass("focus");
    cy.getElementById(b).addClass("focus");
    cy.edges().removeClass("focusEdge");
  }

  function invalidatePlan() {
    planCy.elements().remove();
    planMsgEl.textContent = "Aún no has generado el plan.";
    cy.nodes().removeClass("cycle");
  }

  function addEdge(from, to) {
    if (edgeExists(edges, from, to)) return;

    edges.push({ from, to });

    cy.add({
      data: { id: `${from}_${to}`, source: from, target: to },
    });

    cy.edges().removeClass("focusEdge");
    cy.getElementById(`${from}_${to}`).addClass("focusEdge");

    invalidatePlan();
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
    invalidatePlan();
  });

  function handleGeneratePlan() {
    cy.nodes().removeClass("cycle");
    planCy.elements().remove();
    planMsgEl.textContent = "";

    const mode = planModeEl.value;

    if (mode === "waves") {
      const res = computePlanLevels(items, edges);

      if (!res.ok) {
        res.cycleNodes.forEach((id) => cy.getElementById(id).addClass("cycle"));
        planMsgEl.innerHTML =
          `<span style="color:#d93025"><strong>Hay una contradicción en las dependencias</strong></span>. ` +
          `Revisa los nodos en rojo arriba.`;
        return;
      }

      renderPlanWaves(res.levels);
      planMsgEl.innerHTML = `<strong>Plan generado:</strong> ${res.levels.length} fases, ${res.order.length} tareas.`;
      return;
    }

    const res = topoSortPriority(items, edges);

    if (!res.ok) {
      res.cycleNodes.forEach((id) => cy.getElementById(id).addClass("cycle"));
      planMsgEl.innerHTML =
        `<span style="color:#d93025"><strong>Hay una contradicción en las dependencias</strong></span>. ` +
        `Revisa los nodos en rojo arriba.`;
      return;
    }

    renderPlanLinear(res.order);
    planMsgEl.innerHTML = `<strong>Plan generado:</strong> ${res.order.length} pasos.`;
  }

  function renderPlanLinear(orderIds) {
    const startX = 120;
    const stepX = 220;
    const y = 160;

    const nodes = orderIds.map((id, idx) => {
      const pid = `p_${id}`;
      return {
        data: { id: pid, label: idToItem.get(id)?.label ?? id },
        position: { x: startX + idx * stepX, y },
        locked: true,
      };
    });

    const edgesSeq = [];
    for (let i = 0; i < orderIds.length - 1; i++) {
      edgesSeq.push({
        data: { id: `pe_${i}`, source: `p_${orderIds[i]}`, target: `p_${orderIds[i + 1]}` },
      });
    }

    planCy.add([...nodes, ...edgesSeq]);
    planCy.fit(undefined, 30);
  }

  function renderPlanWaves(levels) {
    const colX = 140;
    const colGap = 260;
    const rowY = 90;
    const rowGap = 86;

    const nodeIdMap = new Map();
    const nodes = [];

    levels.forEach((levelIds, waveIdx) => {
      levelIds.forEach((id, rowIdx) => {
        const pid = `p_${id}`;
        nodeIdMap.set(id, pid);
        nodes.push({
          data: { id: pid, label: idToItem.get(id)?.label ?? id, wave: waveIdx + 1 },
          position: { x: colX + waveIdx * colGap, y: rowY + rowIdx * rowGap },
          locked: true,
        });
      });
    });

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

    planCy.add([...nodes, ...planEdges]);
    planCy.fit(undefined, 30);
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