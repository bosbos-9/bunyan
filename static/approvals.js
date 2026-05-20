/** Approvals page — only PM-submitted milestones awaiting verification. */

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
          <div class="milestone-meta">
            Due ${milestone.expected_completion_date} ·
            Allocated ${formatCurrency(milestone.allocated_amount)} ·
            Actual cost ${formatCurrency(milestone.actual_cost)}
          </div>
          <div class="milestone-meta">${approvalFundLineHtml(milestone)}</div>
        </div>
        <span class="badge badge-review">Pending</span>
      </div>
      <div class="approvals">${buildApprovalChipsHtml(milestone, index)}</div>
    </li>
  `;
}

//render the approvals page
function renderApprovals(project) {
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
    }

    renderApprovals(data.project);
  } catch {
    showToast("Network error", true);
  }
}
//listen for the DOM content loaded event
document.addEventListener("DOMContentLoaded", () => {
  const project = readInitialProject();
  if (project) renderApprovals(project);
});
