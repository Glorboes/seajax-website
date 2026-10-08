document.querySelectorAll('.button > span, .text-link > span').forEach(arrow => arrow.remove());

const footerEmail = document.querySelector('footer a[href^="mailto:"]');
if (footerEmail) {
  const whatsapp = document.createElement('a');
  whatsapp.href = 'https://wa.me/27764911768';
  whatsapp.target = '_blank';
  whatsapp.rel = 'noopener';
  whatsapp.textContent = 'WhatsApp +27 76 491 1768';
  whatsapp.setAttribute('aria-label', 'Chat with Seajax on WhatsApp at +27 76 491 1768');
  footerEmail.after(whatsapp);
}

function startSmoothVideoLoop(videos) {
  videos[0].classList.add('is-visible');
  let active = 0;
  let crossfading = false;
  const resume = () => videos[active].play().catch(() => {});
  async function crossfade() {
    if (crossfading) return;
    crossfading = true;
    const outgoing = videos[active];
    const incoming = videos[1 - active];
    incoming.currentTime = 0;
    try { await incoming.play(); } catch (_) { crossfading = false; return; }
    requestAnimationFrame(() => {
      incoming.classList.add('is-visible');
      outgoing.classList.remove('is-visible');
    });
    window.setTimeout(() => {
      outgoing.pause();
      outgoing.currentTime = 0;
      active = 1 - active;
      crossfading = false;
    }, 1400);
  }
  videos.forEach(video => video.addEventListener('timeupdate', () => {
    if (video === videos[active] && video.duration - video.currentTime <= 1.5) crossfade();
  }));
  videos[0].addEventListener('canplay', resume, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resume();
  });
  document.addEventListener('touchstart', resume, { once: true, passive: true });
  document.addEventListener('pointerdown', resume, { once: true, passive: true });
  resume();
}

function startMobileVideoLoop(video) {
  video.classList.add('is-visible');
  let fading = false;
  const resume = () => video.play().catch(() => {});
  video.addEventListener('timeupdate', () => {
    if (!fading && video.duration - video.currentTime <= 0.8) {
      fading = true;
      video.classList.add('is-loop-fading');
    }
  });
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    resume();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      video.classList.remove('is-loop-fading');
      fading = false;
    }));
  });
  video.addEventListener('canplay', resume, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resume();
  });
  document.addEventListener('touchstart', resume, { once: true, passive: true });
  document.addEventListener('pointerdown', resume, { once: true, passive: true });
  resume();
}

function configureBackgroundVideo(video) {
  video.autoplay = true;
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
}

const heroVideo = document.querySelector('.hero-video');
if (heroVideo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const mobilePlayback = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  configureBackgroundVideo(heroVideo);
  heroVideo.loop = false;
  const videos = [heroVideo];
  if (mobilePlayback) {
    startMobileVideoLoop(videos[0]);
  } else {
    const secondVideo = heroVideo.cloneNode(false);
    secondVideo.classList.remove('is-visible', 'is-loop-fading');
    videos.push(secondVideo);
    videos[0].after(videos[1]);
    startSmoothVideoLoop(videos);
  }
}

const bookingLinks = document.querySelector('.booking > div');
if (bookingLinks) {
  for (const [label, href] of [
    ['Book on LekkeSlaap', 'https://www.lekkeslaap.co.za/accommodation/seajax'],
    ['Book on NightsBridge', 'https://book.nightsbridge.com/39699']
  ]) {
    const link = document.createElement('a');
    link.className = 'button outline';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = label;
    bookingLinks.append(link);
  }
}

const bookingSection = document.querySelector('.booking');
const bookingVideo = document.querySelector('.booking-video');
if (bookingSection && bookingVideo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const mobilePlayback = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  configureBackgroundVideo(bookingVideo);
  bookingVideo.loop = false;
  bookingVideo.playbackRate = 0.8;
  const videos = [bookingVideo];
  if (mobilePlayback) {
    startMobileVideoLoop(videos[0]);
  } else {
    const secondVideo = bookingVideo.cloneNode(false);
    secondVideo.classList.remove('is-visible', 'is-loop-fading');
    videos.push(secondVideo);
    bookingSection.prepend(videos[1]);
    startSmoothVideoLoop(videos);
  }
}

const coastSection = document.querySelector('.coast');
const coastVideo = document.querySelector('.coast-video');
if (coastSection && coastVideo) {
  configureBackgroundVideo(coastVideo);
  coastVideo.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  coastVideo.loop = true;
  coastVideo.preload = 'metadata';
  const resumeCoastVideo = () => coastVideo.play().catch(() => {});
  coastVideo.addEventListener('canplay', resumeCoastVideo, { once: true });
  document.addEventListener('touchstart', resumeCoastVideo, { once: true, passive: true });
  document.addEventListener('pointerdown', resumeCoastVideo, { once: true, passive: true });
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
