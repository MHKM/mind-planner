import template from "./graph.html?raw";
import "./graph.css";
import cytoscape from "cytoscape";
import { allPairs, edgeExists } from "../../app/pairs.js";
import { computePlanLevels } from "../../app/planLevels.js";
import { topoSortPriority } from "../../app/topoSortPriority.js";
import { detectCycle, findCycleQuestions } from "../../app/cycleDetector.js";

export function renderGraphScreen(root, { goal, items, edges, onBack }) {
  root.innerHTML = template;

  // Inyectar el objetivo de forma segura
  const goalText = root.querySelector("#goal-text");
  goalText.textContent = goal || "—";

  const idToItem = new Map(items.map((it) => [it.id, it]));
  const ids = items.map((it) => it.id);
  const pairs = allPairs(ids);

  let pairIndex = 0; // Empezar desde la primera pregunta

  root.querySelector("#back-btn").addEventListener("click", onBack);

  // ===== Cytoscape: grafo principal =====
  const truncateLabel = (label, maxLength = 25) => {
    return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
  };

  const mainElements = [
    ...items.map((it) => ({
      data: { id: it.id, label: truncateLabel(it.label), description: it.description },
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
    autoungrabify: true,
    userZoomingEnabled: false,
    userPanningEnabled: false,
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          "background-color": "#ffffff",
          "border-width": 2,
          "border-color": "#d0d4dd",
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": "180px",
          "font-size": "14px",
          "font-weight": "500",
          color: "#111",
          width: "label",
          height: "label",
          "padding": "12px",
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
    autoungrabify: true,
    userZoomingEnabled: false,
    userPanningEnabled: false,
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: 200,
          height: 60,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": "180px",
          "font-size": "14px",
          "font-weight": "500",
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
      { selector: ".focus", style: { "border-color": "#1589ee", "border-width": 4 } },
      { selector: ".focusEdge", style: { "line-color": "#1589ee", "target-arrow-color": "#1589ee", width: 3 } },
      { selector: ".cycle", style: { "border-color": "#d93025", "border-width": 4 } },
      { selector: ".cycle-edge", style: { "line-color": "#dc2626", "target-arrow-color": "#dc2626", width: 4 } },
    ],
  });

  const progressEl = root.querySelector("#progress-text");
  const progressFillEl = root.querySelector("#progress-fill");
  const questionEl = root.querySelector("#question");
  const planMsgEl = root.querySelector("#plan-msg");
  const planModeEl = root.querySelector("#plan-mode");
  const questionCounterEl = root.querySelector("#question-counter");
  const cycleWarningEl = root.querySelector("#cycle-warning");
  const cycleWarningTextEl = root.querySelector("#cycle-warning-text");
  const cycleItemsEl = root.querySelector("#cycle-items");

  const btnAdepB = root.querySelector("#a-dep-b");
  const btnBdepA = root.querySelector("#b-dep-a");
  const btnNone = root.querySelector("#none");
  const btnGenPlan = root.querySelector("#gen-plan");
  const btnPrevQuestion = root.querySelector("#prev-question");
  const btnNextQuestion = root.querySelector("#next-question");
  const btnReviewCycle = root.querySelector("#review-cycle");

  btnGenPlan.addEventListener("click", handleGeneratePlan);
  btnPrevQuestion.addEventListener("click", () => {
    if (pairIndex > 0) {
      pairIndex--;
      refreshQA();
    }
  });
  btnNextQuestion.addEventListener("click", () => {
    if (pairIndex < pairs.length - 1) {
      pairIndex++;
      refreshQA();
    }
  });

  btnReviewCycle.addEventListener("click", () => {
    const cycleInfo = detectCycle(items, edges);
    if (cycleInfo.hasCycle) {
      const questionIndices = findCycleQuestions(cycleInfo.cycleEdges, pairs);
      if (questionIndices.length > 0) {
        pairIndex = questionIndices[0];
        refreshQA();
      }
    }
  });


  function getCurrentAnswer() {
    if (pairIndex >= pairs.length) return null;
    const [a, b] = pairs[pairIndex];
    
    if (edgeExists(edges, a, b)) return { type: 'a-dep-b', from: a, to: b };
    if (edgeExists(edges, b, a)) return { type: 'b-dep-a', from: b, to: a };
    if (edges.some((e) => e.noneId === noneId(a, b))) return { type: 'none' };
    
    return null;
  }

  function clearCurrentAnswer() {
    if (pairIndex >= pairs.length) return;
    const [a, b] = pairs[pairIndex];
    
    // Eliminar edge a->b
    const idx1 = edges.findIndex((e) => e.from === a && e.to === b);
    if (idx1 >= 0) {
      edges.splice(idx1, 1);
      const edgeId = `${a}_${b}`;
      cy.getElementById(edgeId).remove();
    }
    
    // Eliminar edge b->a
    const idx2 = edges.findIndex((e) => e.from === b && e.to === a);
    if (idx2 >= 0) {
      edges.splice(idx2, 1);
      const edgeId = `${b}_${a}`;
      cy.getElementById(edgeId).remove();
    }
    
    // Eliminar marcador "none"
    const nid = noneId(a, b);
    const idx3 = edges.findIndex((e) => e.noneId === nid);
    if (idx3 >= 0) {
      edges.splice(idx3, 1);
    }
    
    invalidatePlan();
  }

  function refreshQA() {
    const decided = countDecidedPairs(pairs, edges);
    const percentage = pairs.length > 0 ? (decided / pairs.length) * 100 : 0;
    
    progressEl.textContent = `${decided} / ${pairs.length} parejas`;
    progressFillEl.style.width = `${percentage}%`;
    questionCounterEl.textContent = `Pregunta ${pairIndex + 1} de ${pairs.length}`;

    btnPrevQuestion.disabled = pairIndex <= 0;
    btnNextQuestion.disabled = pairIndex >= pairs.length - 1;
    
    // Deshabilitar generar plan si no están todas contestadas
    btnGenPlan.disabled = decided < pairs.length;

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
      <div class="muted">Pregunta ${pairIndex + 1}</div>
      <div class="muted small" style="margin-top:6px">¿<strong>${escapeHtml(A.label)}</strong> depende de <strong>${escapeHtml(B.label)}</strong>?</div>
    `;

    btnAdepB.textContent = `${A.label} depende de ${B.label}`;
    btnBdepA.textContent = `${B.label} depende de ${A.label}`;

    // Resetear estilos de todos los botones
    btnAdepB.classList.remove('selected');
    btnBdepA.classList.remove('selected');
    btnNone.classList.remove('selected');
    btnAdepB.disabled = false;
    btnBdepA.disabled = false;
    btnNone.disabled = false;

    // Marcar botón seleccionado si existe una respuesta
    const currentAnswer = getCurrentAnswer();
    if (currentAnswer) {
      if (currentAnswer.type === 'a-dep-b') {
        btnAdepB.classList.add('selected');
      } else if (currentAnswer.type === 'b-dep-a') {
        btnBdepA.classList.add('selected');
      } else {
        btnNone.classList.add('selected');
      }
    }

    cy.nodes().removeClass("focus");
    cy.getElementById(a).addClass("focus");
    cy.getElementById(b).addClass("focus");
    
    cycleWarningEl.style.display = 'none';
    cy.edges().removeClass("focusEdge");
    if (currentAnswer && currentAnswer.from) {
      const edgeId = `${currentAnswer.from}_${currentAnswer.to}`;
      cy.getElementById(edgeId).addClass("focusEdge");
    }
  }

  function invalidatePlan() {
    planCy.elements().remove();
    planMsgEl.textContent = "Aún no has generado el plan.";
    cy.nodes().removeClass("cycle");
    cy.edges().removeClass("cycle-edge");
    cycleWarningEl.style.display = 'none';
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
    clearCurrentAnswer();
    addEdge(b, a);
    // Avanzar automáticamente a la siguiente sin respuesta
    const nextUnanswered = findNextPairIndex(pairs, edges);
    if (nextUnanswered < pairs.length) {
      pairIndex = nextUnanswered;
    } else if (pairIndex < pairs.length - 1) {
      pairIndex++;
    }
    refreshQA();
    
    // Si se completaron todas las preguntas, generar plan automáticamente
    if (countDecidedPairs(pairs, edges) === pairs.length) {
      handleGeneratePlan();
    }
  });

  btnBdepA.addEventListener("click", () => {
    const [a, b] = pairs[pairIndex];
    clearCurrentAnswer();
    addEdge(a, b);
    // Avanzar automáticamente a la siguiente sin respuesta
    const nextUnanswered = findNextPairIndex(pairs, edges);
    if (nextUnanswered < pairs.length) {
      pairIndex = nextUnanswered;
    } else if (pairIndex < pairs.length - 1) {
      pairIndex++;
    }
    refreshQA();
    
    // Si se completaron todas las preguntas, generar plan automáticamente
    if (countDecidedPairs(pairs, edges) === pairs.length) {
      handleGeneratePlan();
    }
  });

  btnNone.addEventListener("click", () => {
    clearCurrentAnswer();
    markPairAsNone(pairs[pairIndex], edges);
    // Avanzar automáticamente a la siguiente sin respuesta
    const nextUnanswered = findNextPairIndex(pairs, edges);
    if (nextUnanswered < pairs.length) {
      pairIndex = nextUnanswered;
    } else if (pairIndex < pairs.length - 1) {
      pairIndex++;
    }
    refreshQA();
    
    // Si se completaron todas las preguntas, generar plan automáticamente
    if (countDecidedPairs(pairs, edges) === pairs.length) {
      handleGeneratePlan();
    }
  });

  function handleGeneratePlan() {
    cy.nodes().removeClass("cycle");
    cy.edges().removeClass("cycle-edge");
    planCy.elements().remove();
    planMsgEl.textContent = "";
    cycleWarningEl.style.display = 'none';

    const mode = planModeEl.value;

    if (mode === "waves") {
      const res = computePlanLevels(items, edges);

      if (!res.ok) {
        showCycleWarning(res.cycleNodes);
        return;
      }

      renderPlanWaves(res.levels);
      planMsgEl.innerHTML = `<strong>✓ Plan generado:</strong> ${res.levels.length} fases, ${res.order.length} tareas.`;
      return;
    }

    const res = topoSortPriority(items, edges);

    if (!res.ok) {
      showCycleWarning(res.cycleNodes);
      return;
    }

    renderPlanLinear(res.order);
    planMsgEl.innerHTML = `<strong>✓ Plan generado:</strong> ${res.order.length} pasos.`;
  }

  function showCycleWarning(cycleNodes) {
    cy.nodes().removeClass("cycle");
    cy.edges().removeClass("cycle-edge");
    
    cycleNodes.forEach((id) => cy.getElementById(id).addClass("cycle"));
    
    const cycleInfo = detectCycle(items, edges);
    
    if (cycleInfo.hasCycle) {
      // Resaltar edges del ciclo
      cycleInfo.cycleEdges.forEach(({ from, to }) => {
        const edgeId = `${from}_${to}`;
        cy.getElementById(edgeId).addClass("cycle-edge");
      });

      // Mostrar warning con detalles
      const cycleTaskNames = cycleInfo.cycle.map(id => idToItem.get(id)?.label || id);
      
      cycleWarningTextEl.innerHTML = `Las siguientes tareas forman un círculo imposible:`;
      
      cycleItemsEl.innerHTML = cycleInfo.cycleEdges.map(({ from, to }, idx) => {
        const fromName = idToItem.get(from)?.label || from;
        const toName = idToItem.get(to)?.label || to;
        const pairIdx = pairs.findIndex(([a, b]) => 
          (a === from && b === to) || (a === to && b === from)
        );
        
        return `
          <div class="cycle-item">
            <span class="cycle-item-task">${escapeHtml(fromName)}</span>
            <span class="cycle-item-arrow">→</span>
            <span class="cycle-item-task">${escapeHtml(toName)}</span>
            ${pairIdx >= 0 ? `
              <button 
                class="secondary cycle-item-action" 
                data-question-idx="${pairIdx}"
                onclick="this.getRootNode().host?.jumpToQuestion?.(${pairIdx}) || window.jumpToQuestion?.(${pairIdx})"
              >Ver pregunta</button>
            ` : ''}
          </div>
        `;
      }).join('');
      
      cycleWarningEl.style.display = 'block';
      
      // Función global para navegar a pregunta
      window.jumpToQuestion = (idx) => {
        pairIndex = idx;
        refreshQA();
        root.querySelector('.qa-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    }
    
    planMsgEl.innerHTML =
      `<span style="color:#d93025"><strong>⚠️ Dependencias circulares detectadas</strong></span><br/>` +
      `Revisa la explicación arriba para resolverlas.`;
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
