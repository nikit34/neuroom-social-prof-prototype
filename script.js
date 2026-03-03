const scenarios = [
  {
    id: "s1",
    title: "Почти дедлайн, средний social signal",
    subject: "Русский язык",
    createdAt: "18.02.2026",
    deadline: "19.02",
    daysLeft: 1,
    x: 9,
    y: 22,
    description: "Переписать 3 предложения и подчеркнуть грамматическую основу."
  },
  {
    id: "s2",
    title: "Ранний срок, низкая доля сдачи",
    subject: "Математика",
    createdAt: "03.03.2026",
    deadline: "10.03",
    daysLeft: 7,
    x: 4,
    y: 20,
    description: "Решить №214, №216, №218."
  },
  {
    id: "s3",
    title: "Дедлайн завтра, высокий social signal",
    subject: "Геометрия",
    createdAt: "01.03.2026",
    deadline: "04.03",
    daysLeft: 1,
    x: 17,
    y: 22,
    description: "Доказать теорему и решить задачу на касательные."
  },
  {
    id: "s4",
    title: "Малый класс (не показывать)",
    subject: "Русский язык",
    createdAt: "25.02.2026",
    deadline: "05.03",
    daysLeft: 2,
    x: 5,
    y: 7,
    description: "Списать текст, выделить основы, указать части речи."
  }
];

const simulationDataset = [
  { x: 3, y: 20, daysLeft: 5 },
  { x: 7, y: 20, daysLeft: 2 },
  { x: 12, y: 22, daysLeft: 1 },
  { x: 16, y: 22, daysLeft: 1 },
  { x: 5, y: 15, daysLeft: 4 },
  { x: 11, y: 18, daysLeft: 2 },
  { x: 4, y: 9, daysLeft: 1 },
  { x: 8, y: 10, daysLeft: 3 }
];

const scenarioSelect = document.querySelector("#scenarioSelect");
const thresholdInput = document.querySelector("#thresholdInput");
const thresholdValue = document.querySelector("#thresholdValue");
const nearDeadlineOnly = document.querySelector("#nearDeadlineOnly");
const placementSegment = document.querySelector("#placementSegment");
const decisionCard = document.querySelector("#decisionCard");
const simulationTable = document.querySelector("#simulationTable");
const studentsCountInput = document.querySelector("#studentsCountInput");
const studentsCountValue = document.querySelector("#studentsCountValue");
const studentsSimResult = document.querySelector("#studentsSimResult");

const subjectChip = document.querySelector("#subjectChip");
const homeworkDate = document.querySelector("#homeworkDate");
const taskDescription = document.querySelector("#taskDescription");
const deadlineDate = document.querySelector("#deadlineDate");
const daysLeft = document.querySelector("#daysLeft");
const socialProofBox = document.querySelector("#socialProofBox");
const placementHint = document.querySelector("#placementHint");

let selectedScenarioId = scenarios[0].id;
let selectedPlacement = "detail";

for (const scenario of scenarios) {
  const option = document.createElement("option");
  option.value = scenario.id;
  option.textContent = scenario.title;
  scenarioSelect.append(option);
}

function computeDecision(scenario, threshold, isNearDeadlineOnly) {
  const ratio = scenario.y > 0 ? scenario.x / scenario.y : 0;
  const hasEnoughAudience = scenario.y >= 8;
  const isNearDeadline = scenario.daysLeft <= 3;
  const nearDeadlineOk = !isNearDeadlineOnly || isNearDeadline;
  const show = ratio > threshold && hasEnoughAudience && nearDeadlineOk;

  return {
    show,
    ratio,
    hasEnoughAudience,
    isNearDeadline,
    nearDeadlineOk
  };
}

function effectByPlacement(placement) {
  return placement === "detail" ? 0.08 : 0.03;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderDecisionCard(scenario, decision, threshold) {
  const effect = effectByPlacement(selectedPlacement);
  const expectedLift = decision.show ? effect : 0;
  const reasons = [];

  reasons.push(`Сдали / получатели = ${scenario.x} / ${scenario.y} = ${decision.ratio.toFixed(2)}`);
  reasons.push(`Порог показа = ${threshold.toFixed(2)}`);

  if (!decision.hasEnoughAudience) {
    reasons.push("Получателей меньше 8, аудитория слишком мала для устойчивого эффекта");
  }

  if (!decision.nearDeadlineOk) {
    reasons.push("До дедлайна больше 3 дней, показ отключен");
  }

  const statusClass = decision.show ? "ok" : "skip";
  const statusText = decision.show ? "Показывать" : "Не показывать";

  decisionCard.innerHTML = `
    <span class="status ${statusClass}">${statusText}</span>
    <p><strong>Ожидаемый uplift timely submit:</strong> ${decision.show ? `+${Math.round(expectedLift * 100)}%` : "+0%"}</p>
    <p><strong>Логика:</strong> ${reasons.join("; ")}</p>
    <p><strong>Рекомендация:</strong> ${selectedPlacement === "detail" ? "Экран просмотра ДЗ перед CTA" : "Экран отправки, но эффект ниже"}</p>
  `;
}

function renderScreen(scenario, decision) {
  subjectChip.textContent = scenario.subject;
  homeworkDate.textContent = `Задание от ${scenario.createdAt}`;
  taskDescription.textContent = scenario.description;
  deadlineDate.textContent = scenario.deadline;
  daysLeft.textContent = String(scenario.daysLeft);

  placementHint.textContent = selectedPlacement === "detail"
    ? "Показ в точке решения: перед кнопкой " + '"Сдать ДЗ на проверку"'
    : "Показ на экране отправки фото: эффект обычно ниже";

  if (decision.show) {
    socialProofBox.classList.add("show");
    socialProofBox.innerHTML = `
      <p class="title">Уже сдали ${scenario.x} из ${scenario.y}</p>
      <p class="meta">Большая часть класса уже отправила работу. Сдавай сейчас, пока не вышел срок.</p>
    `;
  } else {
    socialProofBox.classList.remove("show");
    socialProofBox.innerHTML = "";
  }
}

function simulateThreshold(z, placement, nearDeadlineFilter) {
  const effect = effectByPlacement(placement);
  let shownCount = 0;
  let total = 0;
  let baseline = 0;
  let projected = 0;

  for (const row of simulationDataset) {
    const ratio = row.x / row.y;
    const baseProb = Math.min(0.86, 0.38 + ratio * 0.28);
    const nearDeadlineOk = !nearDeadlineFilter || row.daysLeft <= 3;
    const show = ratio > z && row.y >= 8 && nearDeadlineOk;

    let adjusted = baseProb;
    if (show) {
      shownCount += 1;
      const damping = ratio < 0.35 || ratio > 0.85 ? 0.5 : 1;
      adjusted = Math.min(0.95, baseProb + effect * damping);
    }

    total += 1;
    baseline += baseProb;
    projected += adjusted;
  }

  return {
    z,
    shownCount,
    shownShare: shownCount / total,
    uplift: (projected - baseline) / total
  };
}

function renderSimulationTable() {
  const candidates = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6].map((z) =>
    simulateThreshold(z, selectedPlacement, nearDeadlineOnly.checked)
  );

  const best = candidates.reduce((acc, row) => (row.uplift > acc.uplift ? row : acc), candidates[0]);

  let html = "<table><thead><tr><th>Порог показа</th><th>Показы</th><th>Доля показов</th><th>Оценка uplift</th></tr></thead><tbody>";

  for (const row of candidates) {
    const isBest = row.z === best.z;
    html += `
      <tr class="${isBest ? "best" : ""}">
        <td>${row.z.toFixed(2)}</td>
        <td>${row.shownCount} из ${simulationDataset.length}</td>
        <td>${formatPercent(row.shownShare)}</td>
        <td>+${formatPercent(row.uplift)}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  html += `<p><strong>Лучший кандидат в этом наборе:</strong> порог показа = ${best.z.toFixed(2)}</p>`;
  simulationTable.innerHTML = html;
}

function renderStudentsCountSimulation(scenario, threshold) {
  const totalStudents = Number(studentsCountInput.value);
  studentsCountValue.textContent = String(totalStudents);

  const baseRatio = scenario.y > 0 ? scenario.x / scenario.y : 0;
  let submittedStudents = Math.round(baseRatio * totalStudents);
  submittedStudents = Math.max(0, Math.min(totalStudents, submittedStudents));

  const simulatedScenario = {
    x: submittedStudents,
    y: totalStudents,
    daysLeft: scenario.daysLeft
  };

  const simulatedDecision = computeDecision(simulatedScenario, threshold, nearDeadlineOnly.checked);
  const simulatedRatio = totalStudents > 0 ? submittedStudents / totalStudents : 0;

  let note = "Условия показа выполнены.";
  if (!simulatedDecision.hasEnoughAudience) {
    note = "Получателей меньше 8, поэтому блок скрывается.";
  } else if (!simulatedDecision.nearDeadlineOk) {
    note = "До дедлайна больше 3 дней, поэтому блок скрывается.";
  } else if (!simulatedDecision.show) {
    note = "Доля сдавших ниже порога показа.";
  }

  studentsSimResult.innerHTML = `
    <span class="status ${simulatedDecision.show ? "ok" : "skip"}">${simulatedDecision.show ? "Блок покажется" : "Блок не покажется"}</span>
    <p class="sim-meta"><strong>При ${totalStudents} получателях</strong> ожидаемо сдадут <strong>${submittedStudents}</strong>.</p>
    <div class="sim-progress">
      <div class="sim-progress__fill" style="width: ${(simulatedRatio * 100).toFixed(1)}%"></div>
    </div>
    <p class="sim-meta">Доля сдавших: ${(simulatedRatio).toFixed(2)} | Порог показа: ${threshold.toFixed(2)}</p>
    <p class="sim-meta">${note}</p>
  `;
}

function rerender() {
  const scenario = scenarios.find((item) => item.id === selectedScenarioId);
  const threshold = Number(thresholdInput.value);

  thresholdValue.textContent = threshold.toFixed(2);

  const decision = computeDecision(scenario, threshold, nearDeadlineOnly.checked);
  renderDecisionCard(scenario, decision, threshold);
  renderScreen(scenario, decision);
  renderSimulationTable();
  renderStudentsCountSimulation(scenario, threshold);
}

scenarioSelect.addEventListener("change", (event) => {
  selectedScenarioId = event.target.value;
  const scenario = scenarios.find((item) => item.id === selectedScenarioId);
  studentsCountInput.value = String(scenario.y);
  studentsCountValue.textContent = String(scenario.y);
  rerender();
});

thresholdInput.addEventListener("input", rerender);
nearDeadlineOnly.addEventListener("change", rerender);
studentsCountInput.addEventListener("input", rerender);

placementSegment.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-placement]");
  if (!target) return;

  selectedPlacement = target.dataset.placement;
  for (const button of placementSegment.querySelectorAll("button")) {
    button.classList.toggle("active", button === target);
  }

  rerender();
});

rerender();
