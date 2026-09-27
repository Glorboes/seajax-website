document.querySelectorAll('.unit-slideshow').forEach(slideshow => {
  const photos = unitPhotos[slideshow.dataset.unit];
  const image = slideshow.querySelector('img');
  const count = slideshow.querySelector('.photo-count');
  let index = 0;
  function show(next) {
    index = (next + photos.length) % photos.length;
    image.src = photos[index].src;
    image.alt = photos[index].alt;
    count.textContent = `${index + 1} / ${photos.length}`;
  }
  slideshow.querySelector('.previous').addEventListener('click', () => show(index - 1));
  slideshow.querySelector('.next').addEventListener('click', () => show(index + 1));
  slideshow.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touchStart;
  slideshow.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    touchStart = {x: touch.clientX, y: touch.clientY};
  }, {passive: true});
  slideshow.addEventListener('touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, {passive: true});
  slideshow.addEventListener('touchcancel', () => { touchStart = null; }, {passive: true});
});
document.querySelector('#year').textContent = new Date().getFullYear();
