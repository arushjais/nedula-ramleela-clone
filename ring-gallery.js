(() => {
  const stage = document.querySelector('[data-ring-gallery]');
  if (!stage) return;
  const ring = stage.querySelector('.ring-gallery-ring');
  const cards = [...document.querySelectorAll('.committee-person-card')];
  const photos = cards.map(card => ({
    src: card.querySelector('img')?.getAttribute('src'),
    alt: card.querySelector('img')?.getAttribute('alt') || card.querySelector('h2')?.textContent.trim() || 'समिति के पदाधिकारी',
  })).filter(photo => photo.src);
  if (!photos.length) return;

  // One card per portrait leaves a visible gap between neighboring cards.
  const slots = photos.length;
  const radius = Number(stage.dataset.ringRadius) || Math.min(600, Math.max(270, stage.clientWidth * .38));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let index = 0; index < slots; index++) {
    const photoIndex = index % photos.length;
    const photo = photos[photoIndex];
    const itemAngle = (index / slots) * 360;
    const item = document.createElement('figure');
    item.className = 'ring-gallery-item';
    item.style.setProperty('--slot', index);
    item.style.transform = `rotateY(${itemAngle}deg) translateZ(${radius}px)`;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Gallery photo ${photoIndex + 1}: ${photo.alt}`);
    item.dataset.photoIndex = photoIndex;
    const image = document.createElement('img');
    image.src = photo.src;
    image.alt = photo.alt;
    image.loading = 'eager';
    image.draggable = false;
    const face = document.createElement('div');
    face.className = 'ring-gallery-face';
    const caption = document.createElement('figcaption');
    caption.textContent = photo.alt;
    face.append(image);
    face.append(caption);
    item.append(face);
    item.addEventListener('click', () => { if (!draggedRecently) openViewer(photoIndex); });
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openViewer(photoIndex); }
    });
    ring.append(item);
    if (reducedMotion) item.classList.add('is-arrived');
    else setTimeout(() => item.classList.add('is-arrived'), index * 25);
  }

  let angle = 0;
  let velocity = 0;
  let pointerX = null;
  let pointerY = 0;
  let dragMoved = false;
  let draggedRecently = false;
  let lastFrame = performance.now();
  let tiltX = 0;
  let tiltZ = 0;
  let tiltY = 0;
  const animate = now => {
    const dt = Math.min((now - lastFrame) / 16.667, 2);
    lastFrame = now;
    if (pointerX === null && !reducedMotion && Math.abs(velocity) < .015) angle += .012 * dt;
    angle += velocity * dt;
    velocity *= Math.pow(.986, dt);
    ring.style.transform = `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg) rotateY(${angle}deg)`;
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
  stage.addEventListener('pointermove', event => {
    const box = stage.getBoundingClientRect();
    const nx = (event.clientX - box.left) / box.width - .5;
    const ny = (event.clientY - box.top) / box.height - .5;
    tiltX = -ny * 6;
    tiltZ = nx * 3;
    if (pointerX !== null) {
      const dx = event.clientX - pointerX;
      if (Math.abs(dx) > 2) dragMoved = true;
      angle += dx * .34;
      velocity = dx * .09;
      pointerX = event.clientX;
      pointerY = event.clientY;
    }
  });
  stage.addEventListener('pointerleave', () => { if (pointerX === null) { tiltX = 0; tiltZ = 0; } });
  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('.ring-gallery-viewer')) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    dragMoved = false;
    stage.classList.add('is-dragging');
    stage.setPointerCapture(event.pointerId);
  });
  const finishDrag = () => {
    if (pointerX === null) return;
    pointerX = null;
    stage.classList.remove('is-dragging');
    if (dragMoved) {
      draggedRecently = true;
      setTimeout(() => { draggedRecently = false; }, 140);
    }
  };
  stage.addEventListener('pointerup', finishDrag);
  stage.addEventListener('pointercancel', finishDrag);

  let viewer;
  let current = 0;
  let previousFocus;
  const showPhoto = index => {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    viewer.querySelector('img').src = photo.src;
    viewer.querySelector('img').alt = photo.alt;
    viewer.querySelector('figcaption').textContent = photo.alt;
  };
  function openViewer(index) {
    if (draggedRecently) return;
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.className = 'ring-gallery-viewer';
      viewer.hidden = true;
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      viewer.setAttribute('aria-label', 'Image gallery viewer');
      viewer.innerHTML = '<figure><button class="ring-gallery-close" type="button" aria-label="Close">×</button><button class="ring-gallery-nav ring-gallery-prev" type="button" aria-label="Previous photo">‹</button><img alt=""><figcaption></figcaption><button class="ring-gallery-nav ring-gallery-next" type="button" aria-label="Next photo">›</button></figure>';
      viewer.addEventListener('click', event => {
        if (event.target === viewer || event.target.closest('.ring-gallery-close')) closeViewer();
        if (event.target.closest('.ring-gallery-prev')) showPhoto(current - 1);
        if (event.target.closest('.ring-gallery-next')) showPhoto(current + 1);
      });
      document.body.append(viewer);
    }
    previousFocus = document.activeElement;
    showPhoto(index);
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      viewer.classList.add('is-opening');
      requestAnimationFrame(() => viewer.classList.add('is-open'));
      viewer.querySelector('.ring-gallery-close').focus();
    });
  }
  function closeViewer() {
    if (!viewer || viewer.hidden) return;
    viewer.classList.remove('is-open', 'is-opening');
    viewer.hidden = true;
    document.body.style.overflow = '';
    previousFocus?.focus?.();
  }
  document.addEventListener('keydown', event => {
    if (!viewer || viewer.hidden) return;
    if (event.key === 'Escape') closeViewer();
    if (event.key === 'ArrowLeft') showPhoto(current - 1);
    if (event.key === 'ArrowRight') showPhoto(current + 1);
  });
})();
