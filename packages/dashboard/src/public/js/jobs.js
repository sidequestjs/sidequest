document.addEventListener("DOMContentLoaded", () => {
  const timeRange = document.getElementById("time-range");
  const customRange = document.getElementById("custom-range");

  timeRange.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customRange.classList.remove("hidden");
    } else {
      customRange.classList.add("hidden");
    }
  });
});

document.addEventListener("htmx:configRequest", (evt) => {
  const form = evt.target.closest("form");
  if (!form) return;

  const startInput = form.querySelector('input[name="start"]');
  const endInput = form.querySelector('input[name="end"]');

  if (startInput?.value) {
    const startDate = new Date(startInput.value);
    evt.detail.parameters.start = startDate.toISOString();
  }

  if (endInput?.value) {
    const endDate = new Date(endInput.value);
    evt.detail.parameters.end = endDate.toISOString();
  }
});
