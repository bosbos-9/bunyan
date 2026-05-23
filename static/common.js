/** Shared UI helpers loaded on every page. */

//define the role labels
const ROLE_LABELS = {
  engineer: "Engineer",
  rega_inspector: "REGA Inspector",
  trustee: "Trustee",
};

//format the currency in USD
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

//show a toast message with an error or success message using the toast element
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "show" + (isError ? " error" : "");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.className = "";
  }, 3500);
}

//return the error message from the data
function apiError(data) {
  return data.error || "Request failed";
}

//escape the HTML in the text to prevent XSS attacks
function escapeHtml(text) {
  const node = document.createElement("div");
  node.textContent = text;
  return node.innerHTML;
}

//read the initial project from the DOM
function readInitialProject() {
  const node = document.getElementById("initial-project");
  if (!node) return null;
  return JSON.parse(node.textContent || "null");
}

//get the JSON data to the URL and return the response and data
async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}
// reset project by deleting the project from the API and redirect to the project page
async function resetProject() {
  if (!confirm("Reset the current project? All in-memory state will be cleared.")) {
    return false;
  }
  await fetch("/api/project", { method: "DELETE" });
  window.location.href = "/";
  return true;
}

//calculate the progress percentage of the milestones
function milestoneProgressPct(project) {
  return project.milestones_total > 0
    ? (project.milestones_verified / project.milestones_total) * 100
    : 0;
}

function phaseOverage(milestone) {
  return Math.max(0, milestone.actual_cost - milestone.allocated_amount);
}

function phaseSurplus(milestone) {
  return Math.max(0, milestone.allocated_amount - milestone.actual_cost);
}
//return the status badge HTML for the milestone
function statusBadgeHtml(milestone) {
  if (milestone.is_verified) {
    return '<span class="badge badge-verified">Verified</span>';
  }
  if (milestone.submitted) {
    return '<span class="badge badge-review">Awaiting approval</span>';
  }
  return '<span class="badge badge-draft">Draft</span>';
}

function milestoneSummaryHtml(milestone) {
  return `
    <h3>${escapeHtml(milestone.name)}</h3>
    <div class="milestone-meta">
      Due ${milestone.expected_completion_date} ·
      Allocated ${formatCurrency(milestone.allocated_amount)} (${milestone.budget_percentage}%)
    </div>
  `;
}

//return the HTML for the approval fund line
function approvalFundLineHtml(milestone) {
  const released = formatCurrency(milestone.actual_cost);
  const overage = phaseOverage(milestone);
  const surplus = phaseSurplus(milestone);

  if (overage > 0) {
    return `On approval: ${released} released · ${formatCurrency(overage)} over phase allocation`;
  }
  if (surplus > 0) {
    return `On approval: ${released} released · ${formatCurrency(surplus)} held for investors until project complete`;
  }
  return `On approval: ${released} released`;
}

//return the HTML for the verified fund detail
function verifiedFundDetailHtml(milestone, project) {
  let detail = "Released";
  const overage = phaseOverage(milestone);

  if (overage > 0) {
    detail = `Over phase allocation by <strong>${formatCurrency(overage)}</strong>`;
  }
  if (project.is_complete && project.is_over_budget) {
    detail += " · Project over budget — no investor return";
  } else if (project.is_complete && project.total_returned > 0) {
    detail += ` · Project returned <strong>${formatCurrency(project.total_returned)}</strong> to investors`;
  }
  return detail;
}
//return the HTML for the approval chips (optional activeRole shows one role only)
function buildApprovalChipsHtml(milestone, index, activeRole = null) {
  const entries = Object.entries(milestone.approvals).filter(
    ([role]) => !activeRole || role === activeRole
  );
  return entries
    .map(([role, approved]) => {
      const label = ROLE_LABELS[role] || role;
      if (approved) {
        return `<span class="approval-chip approved">
          <span class="approval-chip-label">${label} ✓</span>
        </span>`;
      }
      return `<span class="approval-chip">
        <button type="button" class="btn btn-primary btn-sm approve-btn" data-index="${index}" data-role="${role}">Approve</button>
      </span>`;
    })
    
}
//return the HTML for the verification toast message
function verificationToastMessage(milestone, project) {
  let msg = `"${milestone.name}" verified — ${formatCurrency(milestone.actual_cost)} released`;
  if (project.is_complete && project.is_over_budget) {
    msg += ` · Project over budget by ${formatCurrency(project.total_deficit)}`;
  } else if (project.is_complete && project.total_returned > 0) {
    msg += ` · ${formatCurrency(project.total_returned)} returned to investors`;
  }
  return msg;
}
