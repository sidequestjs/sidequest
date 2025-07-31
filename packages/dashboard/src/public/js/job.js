// Global variable to store details state
let globalDetailsStates = {};

function applySeeMore() {
  document.querySelectorAll(".sq-code").forEach((container) => {
    const content = container.querySelector(".code-content");
    const btn = container.querySelector(".toggle-btn");

    const maxHeight = 240;

    if (content.scrollHeight <= maxHeight) {
      btn.classList.add("hidden");
    }

    function toggleDetails(expanded) {
      if (expanded) {
        content.classList.remove("max-h-[15rem]", "overflow-hidden");
        btn.textContent = "See less";
        globalDetailsStates[container.id] = true; // Save state as expanded
      } else {
        content.classList.add("max-h-[15rem]", "overflow-hidden");
        btn.textContent = "See more";
        globalDetailsStates[container.id] = false; // Save state as not expanded
      }
    }

    toggleDetails(globalDetailsStates[container.id] ?? false);

    btn.addEventListener("click", () => {
      toggleDetails(!globalDetailsStates[container.id] ?? true);
    });
  });
}

document.addEventListener("DOMContentLoaded", applySeeMore);
document.addEventListener("htmx:afterSwap", applySeeMore);
