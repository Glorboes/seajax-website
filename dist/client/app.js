document.querySelectorAll('.button > span, .text-link > span').forEach(arrow => arrow.remove());

const coastSection = document.querySelector('.coast');
if (coastSection) {
  const coastVideo = document.createElement('video');
  coastVideo.className = 'coast-video';
  coastVideo.src = new URL('./blouberg-waves.mp4', document.baseURI).href;
  coastVideo.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  coastVideo.muted = true;
  coastVideo.loop = true;
  coastVideo.playsInline = true;
  coastVideo.preload = 'metadata';
  coastVideo.setAttribute('aria-hidden', 'true');
  coastSection.prepend(coastVideo);
}

document.querySelectorAll('.unit-slideshow').forEach(slideshow => {
  const photos = unitPhotos[slideshow.dataset.unit];
  const image = slideshow.querySelector('img');
  const count = slideshow.querySelector('.photo-count');
  let index = 0;
  let request = 0;
  const cache = new Map();
  const status = document.createElement('span');
  status.className = 'slide-status';
  status.setAttribute('role', 'status');
  slideshow.append(status);
  const wrap = value => (value + photos.length) % photos.length;
  function prepare(position) {
    const photo = photos[wrap(position)];
    if (!cache.has(photo.src)) {
      const preload = new Image();
      preload.decoding = 'async';
      const ready = new Promise((resolve, reject) => {
        preload.onload = async () => {
          try { await preload.decode(); } catch (_) { /* Loaded image remains usable. */ }
          resolve(preload);
        };
        preload.onerror = () => { cache.delete(photo.src); reject(new Error('Photo unavailable')); };
      });
      cache.set(photo.src, ready);
      preload.src = photo.src;
    }
    return cache.get(photo.src);
  }
  function warmNeighbours() {
    [-1, 1, 2].forEach(offset => prepare(index + offset).catch(() => {}));
  }
  async function show(next) {
    index = wrap(next);
    const target = index;
    const currentRequest = ++request;
    status.textContent = '';
    slideshow.setAttribute('aria-busy', 'true');
    const timer = setTimeout(() => {
      if (currentRequest === request) status.textContent = 'Loading photo…';
    }, 180);
    try {
      await prepare(target);
      if (currentRequest !== request) return;
      image.src = photos[target].src;
      image.alt = photos[target].alt;
      count.textContent = `${target + 1} / ${photos.length}`;
      warmNeighbours();
    } catch (_) {
      if (currentRequest === request) status.textContent = 'Photo could not load. Try another arrow.';
    } finally {
      clearTimeout(timer);
      if (currentRequest === request) {
        slideshow.setAttribute('aria-busy', 'false');
        if (status.textContent === 'Loading photo…') status.textContent = '';
      }
    }
  }
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      warmNeighbours();
      observer.disconnect();
    }
  }, {rootMargin: '250px'});
  observer.observe(slideshow);
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
