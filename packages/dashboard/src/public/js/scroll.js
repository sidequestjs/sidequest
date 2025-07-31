let savedScrollY = 0;

// Save and restore scroll position around HTMX swaps
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("htmx:beforeSwap", () => {
    savedScrollY = document.getElementById("main-section").scrollTop;
  });

  document.addEventListener("htmx:afterSwap", () => {
    document.getElementById("main-section").scroll(0, savedScrollY);
  });
});
