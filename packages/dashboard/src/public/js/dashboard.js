let currentRange = "12m";

const now = new Date();
const labels = [];
for (let i = 11; i >= 0; i--) {
  const time = new Date(now.getTime() - i * 60000);
  labels.push(time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
}

const ctx = document.getElementById("jobsTimeline").getContext("2d");

const jobsTimeline = new Chart(ctx, {
  type: "line",
  data: {
    labels: [], // will be set later
    datasets: [
      {
        label: "Completed",
        data: [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Failed",
        data: [],
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: "#ccc" },
        grid: { color: "#333" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#ccc" },
        grid: { color: "#333" },
      },
    },
    plugins: {
      legend: {
        labels: { color: "#ccc" },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
  },
});

async function refreshGraph() {
  const basePath = window.SIDEQUEST_BASE_PATH || "";
  const res = await fetch(`${basePath}/dashboard/graph-data?range=${currentRange}`);
  const graph = await res.json();
  const timestamps = graph.map((entry) => entry.timestamp);

  const labels = [];
  for (const timestamp of timestamps) {
    const bucketTime = new Date(timestamp);
    let label;

    if (currentRange === "12d") {
      label = bucketTime.toLocaleDateString([], { month: "short", day: "numeric" });
    } else {
      label = bucketTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    labels.push(label);
  }

  jobsTimeline.data.labels = labels;
  jobsTimeline.data.datasets[0].data = graph.map((entry) => entry.completed);
  jobsTimeline.data.datasets[1].data = graph.map((entry) => entry.failed);
  jobsTimeline.update();
}
refreshGraph();

const selectElement = document.getElementById("graph-range");
selectElement.addEventListener("change", (event) => {
  currentRange = event.target.value ?? "12m";
  refreshGraph();
  // Trigger HTMX to refresh stats
  htmx.trigger("#dashboard-stats", "refresh");
});

setInterval(refreshGraph, 1000);
