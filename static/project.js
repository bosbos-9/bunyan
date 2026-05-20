/** Create-project form and project-manager milestone submission. */
//parse the number from the input
function parseNumber(raw) {
  const cleaned = String(raw ?? "").trim().replace(/[$,\s]/g, "");
  if (!cleaned) return NaN;
  return Number(cleaned);
}

//parse the date from the date selector
function parseDate(raw) {
  const value = String(raw ?? "").trim();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
    return value;
  }
  return null;
}

//read the milestone row from the DOM
function readMilestoneRow(row, index) {
  const label = `Milestone ${index + 1}`;
  const name = row.querySelector("[data-field='name']").value.trim();
  const dateRaw = row.querySelector("[data-field='expected_completion_date']").value;
  const pct = parseNumber(row.querySelector("[data-field='budget_percentage']").value);

  if (!name) return { error: `${label}: name is required` };
  const completionDate = parseDate(dateRaw);
  if (!completionDate) return { error: `${label}: pick a completion date` };
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return { error: `${label}: budget % must be between 0 and 100` };
  }

  return {
    milestone: {
      name,
      expected_completion_date: completionDate,
      budget_percentage: pct,
    },
    pct,
  };
}

//validate the project form
function validateProjectForm() {
  const name = document.getElementById("project-name")?.value.trim();
  if (!name) return { ok: false, error: "Project name is required" };

  const totalBudget = parseNumber(document.getElementById("total-budget")?.value);
  if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    return { ok: false, error: "Enter a valid total budget greater than zero" };
  }

  const rows = document.querySelectorAll(".milestone-row");
  if (!rows.length) return { ok: false, error: "Add at least one milestone" };

  const milestones = [];
  let totalPct = 0;
  //read the milestone rows from the DOM
  for (let i = 0; i < rows.length; i += 1) {
    const result = readMilestoneRow(rows[i], i);
    if (result.error) return { ok: false, error: result.error };
    totalPct += result.pct;
    milestones.push(result.milestone);
  }
  // is the total percentage of the milestones equal to 100%
  if (Math.abs(totalPct - 100) > 0.01) {
    return {
      ok: false,
      error: `Milestone budget percentages must sum to 100% (currently ${totalPct.toFixed(1)}%)`,
    };
  }

  return { ok: true, payload: { name, total_budget: totalBudget, milestones } };
}

//update the percentage hint so it shows the total percentage of the milestones remaining to be added to 100%
function updatePctHint() {
  const hint = document.getElementById("pct-hint");
  if (!hint) return;

  let total = 0;
  document.querySelectorAll(".milestone-row input[data-field='budget_percentage']").forEach((input) => {
    total += parseFloat(input.value) || 0;
  });

  hint.textContent = `Budget percentages sum: ${total.toFixed(1)}% (must equal 100%)`;
  hint.className = "pct-hint " + (Math.abs(total - 100) < 0.01 ? "valid" : "invalid");
}

//build the HTML for the milestone row
function buildMilestoneRowHtml(data) {
  return `
    <div>
      <label>Milestone name</label>
      <input type="text" data-field="name" placeholder="e.g. Foundation complete" value="${data.name || ""}" autocomplete="off" />
    </div>
    <div>
      <label>Expected completion</label>
      <input type="date" data-field="expected_completion_date" value="${data.expected_completion_date || ""}" />
    </div>
    <div>
      <label>Budget %</label>
      <input type="text" data-field="budget_percentage" inputmode="decimal" placeholder="25" value="${data.budget_percentage ?? ""}" autocomplete="off" />
    </div>
    <button type="button" class="btn btn-ghost remove-milestone" title="Remove milestone" aria-label="Remove">×</button>
  `;
}

//add a new milestone row to the DOM
function addMilestoneRow(data = {}) {
  const container = document.getElementById("milestones-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "milestone-row";
  row.innerHTML = buildMilestoneRowHtml(data);

  //remove the milestone row when the remove button is clicked
  row.querySelector(".remove-milestone").addEventListener("click", () => {
    if (container.querySelectorAll(".milestone-row").length > 1) {
      row.remove();
      updatePctHint();
    }
  });
  //update the percentage hint when the budget percentage is changed
  row.querySelector("[data-field='budget_percentage']").addEventListener("input", updatePctHint);

  container.appendChild(row);
  updatePctHint();
}
//build the HTML for the submit form
function buildSubmitFormHtml(index, allocatedAmount) {
  return `
    <form class="pm-submit-form" data-index="${index}">
      <label>Actual cost</label>
      <div class="inline-form">
        <input type="text" class="actual-cost-input" inputmode="decimal" placeholder="Enter actual spend" autocomplete="off" />
        <button type="button" class="btn btn-secondary btn-sm use-full-amount" data-amount="${allocatedAmount}">Use full amount</button>
        <button type="submit" class="btn btn-primary btn-sm">Submit for verification</button>
      </div>
    </form>
  `;
}

//build the HTML for the PM milestone row
function buildPmMilestoneHtml(milestone, index, project) {
  let actionBlock;

  if (!milestone.submitted) {
    actionBlock = buildSubmitFormHtml(index, milestone.allocated_amount);
  } else if (milestone.is_verified) {
    actionBlock = `
      <p class="milestone-detail">
        Actual cost: <strong>${formatCurrency(milestone.actual_cost)}</strong> ·
        ${verifiedFundDetailHtml(milestone, project)}
      </p>
    `;
  } else {
    actionBlock = `
      <p class="milestone-detail">
        Submitted actual cost: <strong>${formatCurrency(milestone.actual_cost)}</strong> —
        pending Engineer, REGA Inspector, and Trustee approval.
      </p>
    `;
  }

  return `
    <li class="milestone-item">
      <div class="milestone-header">
        <div>${milestoneSummaryHtml(milestone)}</div>
        ${statusBadgeHtml(milestone)}
      </div>
      ${actionBlock}
    </li>
  `;
}

//render the PM milestones
function renderPmMilestones(project) {
  const list = document.getElementById("pm-milestone-list");
  if (!list) return;

  list.innerHTML = project.milestones
    .map((milestone, index) => buildPmMilestoneHtml(milestone, index, project))
    .join("");

  list.querySelectorAll(".pm-submit-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitMilestone(
        parseInt(form.dataset.index, 10),
        form.querySelector(".actual-cost-input").value
      );
    });
  });

  list.querySelectorAll(".use-full-amount").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".pm-submit-form")?.querySelector(".actual-cost-input");
      if (input) input.value = button.dataset.amount;
    });
  });
}
//submit the milestone for verification
async function submitMilestone(index, actualCostRaw) {
  const actualCost = parseNumber(actualCostRaw);
  if (!Number.isFinite(actualCost) || actualCost <= 0) {
    showToast("Enter a valid actual cost", true);
    return;
  }

  try {
    const { response, data } = await postJson(`/api/milestones/${index}/submit`, {
      actual_cost: actualCost,
    });
    if (!response.ok) {
      showToast(apiError(data), true);
      return;
    }
    showToast("Milestone submitted for verification");
    renderPmMilestones(data.project);
  } catch {
    showToast("Network error — is the server running?", true);
  }
}

//create a new project and redirect to the dashboard
async function createProject(event) {
  event.preventDefault();

  const validation = validateProjectForm();
  if (!validation.ok) {
    showToast(validation.error, true);
    return;
  }

  try {
    const { response, data } = await postJson("/api/project", validation.payload);
    if (!response.ok) {
      showToast(apiError(data), true);
      return;
    }
    window.location.href = "/dashboard";
  } catch {
    showToast("Network error — is the server running?", true);
  }
}

//initialize the create form
function initCreateForm() {
  const form = document.getElementById("project-form");
  if (!form) return;

  form.addEventListener("submit", createProject);
  document.getElementById("add-milestone")?.addEventListener("click", () => addMilestoneRow());
  [
    { name: "Site preparation", expected_completion_date: "2026-04-01", budget_percentage: 20 },
    { name: "Structural work", expected_completion_date: "2026-08-01", budget_percentage: 40 },
    { name: "Finishing & handover", expected_completion_date: "2026-12-01", budget_percentage: 40 },
  ].forEach(addMilestoneRow);
}
//reset the project and redirect to the project page
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reset-project")?.addEventListener("click", resetProject);

  const project = readInitialProject();
  if (project) {
    renderPmMilestones(project);
    return;
  }
  initCreateForm();
});
