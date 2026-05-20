/** Dashboard page — progress bar and budget pie chart only (stats are server-rendered). */

const CHART_COLORS = {
  released: ["#0d7a5f", "#14b8a6", "#059669", "#047857", "#10b981"],
  pending: ["#d97706", "#f59e0b", "#fbbf24"],
  planned: ["#cbd5e1", "#94a3b8", "#e2e8f0"],
  returned: ["#0369a1"],
  deficit: ["#dc2626"],
};

let budgetChart = null;

function chartColor(segment, index) {
  const palette = CHART_COLORS[segment.type] || CHART_COLORS.planned;
  return palette[index % palette.length];
}

//render the progress bar
function renderProgress(project) {
  const fill = document.getElementById("progress-fill");
  if (fill) fill.style.width = `${milestoneProgressPct(project)}%`;
}

//render the pie chart
function renderPieChart(project) {
  const canvas = document.getElementById("budget-chart");
  const legend = document.getElementById("chart-legend");
  if (!canvas || !legend) return;

  const segments = project.pie_segments || [];
  legend.innerHTML = segments
    .map(
      (segment, index) => `
      <li>
        <span class="legend-swatch" style="background:${chartColor(segment, index)}"></span>
        <span>${escapeHtml(segment.label)}: <strong>${formatCurrency(segment.value)}</strong></span>
      </li>
    `
    )
    .join("");

  if (budgetChart) budgetChart.destroy();
  if (!segments.length) return;

  budgetChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels: segments.map((s) => s.label),
      datasets: [
        {
          data: segments.map((s) => s.value),
          backgroundColor: segments.map((s, i) => chartColor(s, i)),
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${formatCurrency(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

//listen for the DOM content loaded event
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reset-project")?.addEventListener("click", resetProject);

  const project = readInitialProject();
  if (project) {
    renderProgress(project);
    renderPieChart(project);
  }
});
