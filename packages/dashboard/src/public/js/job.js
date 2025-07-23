function applySeeMore(){
  document.querySelectorAll('.sq-code').forEach(container => {
    const content = container.querySelector('.code-content');
    const btn = container.querySelector('.toggle-btn');

    const maxHeight = 240;
    let expanded = false;

    if (content.scrollHeight <= maxHeight) {
      btn.classList.add('hidden');
    }

    btn.addEventListener('click', () => {
      expanded = !expanded;

      if (expanded) {
        content.classList.remove('max-h-[15rem]', 'overflow-hidden');
        btn.textContent = 'See less';
      } else {
        content.classList.add('max-h-[15rem]', 'overflow-hidden');
        btn.textContent = 'See more';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', applySeeMore);
document.addEventListener('htmx:afterSwap', applySeeMore);