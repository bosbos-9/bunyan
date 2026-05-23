/** Approvals page — only PM-submitted milestones awaiting verification. */

const APPROVAL_ROLES = ["engineer", "rega_inspector", "trustee"];

let activeApprovalRole =
  sessionStorage.getItem("approvalRole") || APPROVAL_ROLES[0];
let currentProject = null;

function approvalProgressText(milestone) {
  const done = Object.values(milestone.approvals).filter(Boolean).length;
  const total = Object.keys(milestone.approvals).length;
  return `${done} of ${total} approvals complete`;
}

function updateRoleToggleUi() {
  document.querySelectorAll(".role-toggle-btn").forEach((button) => {
    const isActive = button.dataset.role === activeApprovalRole;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function setActiveApprovalRole(role) {
  if (!APPROVAL_ROLES.includes(role)) return;
  activeApprovalRole = role;
  sessionStorage.setItem("approvalRole", role);
  updateRoleToggleUi();
  if (currentProject) renderApprovals(currentProject);
}

function initRoleToggle() {
  const toggle = document.getElementById("role-toggle");
  if (!toggle) return;

  toggle.querySelectorAll(".role-toggle-btn").forEach((button) => {
    button.addEventListener("click", () => setActiveApprovalRole(button.dataset.role));
  });
  updateRoleToggleUi();
}

function pendingMilestones(project) {
  return project.milestones
    .map((milestone, index) => ({ milestone, index }))
    .filter(({ milestone }) => milestone.submitted && !milestone.is_verified);
}

//build the HTML for an approval item
function buildApprovalItemHtml({ milestone, index }) {
  return `
    <li class="milestone-item">
      <div class="milestone-header">
        <div>
          <h3>${escapeHtml(milestone.name)}</h3>
           <span class="badge badge-review">Pending</span>
          <div class="milestone-meta"> 
            Due ${milestone.expected_completion_date} <br>
            Allocated ${formatCurrency(milestone.allocated_amount)} <br>
            Actual cost ${formatCurrency(milestone.actual_cost)}
        
      </div>
      <p class="milestone-meta approval-progress">${approvalProgressText(milestone)}</p>
      <div class="approvals">${buildApprovalChipsHtml(milestone, index, activeApprovalRole)}</div>
      
    </li>
  `;
}

//render the approvals page
function renderApprovals(project) {
  currentProject = project;
  const list = document.getElementById("milestone-list");
  const empty = document.getElementById("approvals-empty");
  if (!list) return;

  const pending = pendingMilestones(project);

  if (pending.length === 0) {
    list.innerHTML = "";
    list.classList.add("hidden");
    empty?.classList.remove("hidden");
    return;
  }

  list.classList.remove("hidden");
  empty?.classList.add("hidden");
  list.innerHTML = pending.map(buildApprovalItemHtml).join("");

  list.querySelectorAll(".approve-btn").forEach((button) => {
    button.addEventListener("click", () => {
      approveMilestone(parseInt(button.dataset.index, 10), button.dataset.role);
    });
  });
}

async function approveMilestone(index, role) {
  try {
    const { response, data } = await postJson(`/api/milestones/${index}/approve`, { role });
    if (!response.ok) {
      showToast(apiError(data), true);
      return;
    }
    //get the milestone from the data
    const milestone = data.project.milestones[index];
    if (milestone.is_verified) {
      showToast(verificationToastMessage(milestone, data.project));
      window.location.reload();
    }

    renderApprovals(data.project);
  } catch {
    showToast("Network error", true);
  }
}
//listen for the DOM content loaded event
document.addEventListener("DOMContentLoaded", () => {
  initRoleToggle();
  const project = readInitialProject();
  if (project) renderApprovals(project);
});
