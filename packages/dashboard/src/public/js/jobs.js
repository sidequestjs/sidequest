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
