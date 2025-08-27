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
  const res = await fetch(`/dashboard/graph-data?range=${currentRange}`);
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

  const newCompleted = graph.map((entry) => entry.completed);
  const newFailed = graph.map((entry) => entry.failed);

  // Check if we have existing data and this is a time progression
  if (jobsTimeline.data.labels.length > 0 && labels.length === jobsTimeline.data.labels.length) {
    // Check if this is just a time shift by comparing labels
    // If current labels [1:] match new labels [:-1], it's a time shift
    const isTimeShift = arraysEqual(jobsTimeline.data.labels.slice(1), labels.slice(0, -1));

    if (isTimeShift) {
      // Shift the timeline: remove first elements and add new ones at the end
      jobsTimeline.data.labels.shift();
      jobsTimeline.data.labels.push(labels[labels.length - 1]);

      jobsTimeline.data.datasets[0].data.shift();
      jobsTimeline.data.datasets[0].data.push(newCompleted[newCompleted.length - 1]);

      jobsTimeline.data.datasets[1].data.shift();
      jobsTimeline.data.datasets[1].data.push(newFailed[newFailed.length - 1]);

      jobsTimeline.update("default"); // Use default animation for smooth left shift
      return;
    }
  }

  // For initial load or when data structure changes, replace everything
  jobsTimeline.data.labels = labels;
  jobsTimeline.data.datasets[0].data = newCompleted;
  jobsTimeline.data.datasets[1].data = newFailed;
  jobsTimeline.update("default");
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
