(() => {
  const stage = document.querySelector('.social-wheel-stage');
  const track = stage?.querySelector('.social-grid');
  if (!stage || !track) return;

  const visualOrder = ['WhatsApp', 'Instagram', 'वेबसाइट', 'ईमेल', 'YouTube', 'Facebook', 'X / Twitter'];
  const cards = [...track.querySelectorAll(':scope > a')].sort((a, b) =>
    visualOrder.indexOf(a.querySelector('b')?.textContent.trim()) - visualOrder.indexOf(b.querySelector('b')?.textContent.trim())
  );
  track.append(...cards);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let previous = 0;
  let distance = 0;
  let frame = 0;
  let initialized = false;
  let pointer = null;
  let suppressClick = false;

  const draw = () => {
    const width = stage.clientWidth;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const cardWidth = mobile ? (window.matchMedia('(max-width: 410px)').matches ? 154 : 164) : 190;
    const step = cardWidth + (mobile ? 17 : 21);
    const radius = mobile ? 340 : 410;
    const loopWidth = step * cards.length;
    const center = loopWidth / 2;
    if (!initialized) {
      distance = -Math.floor(cards.length / 2) * step;
      initialized = true;
    }

    cards.forEach((card, index) => {
      let x = ((index * step + distance + center) % loopWidth) - center;
      if (x > loopWidth / 2) x -= loopWidth;
      const angle = Math.max(-56, Math.min(56, (x / radius) * 57.2958));
      const depth = 150 - Math.min(250, (x * x) / (radius * 1.75));
      const curveY = Math.min(28, (x * x) / (radius * 26));
      const blur = Math.max(0, Math.min(6, (Math.abs(x) - cardWidth * 0.55) / 50));
      const scale = 1 - Math.min(0.18, Math.abs(x) / 2500);
      const alpha = Math.max(0.34, 1 - Math.max(0, Math.abs(x) - 310) / 700);
      card.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${curveY.toFixed(2)}px,${depth.toFixed(2)}px) rotateY(${angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      card.style.filter = `blur(${blur.toFixed(2)}px)`;
      card.style.opacity = alpha.toFixed(3);
      card.style.zIndex = String(1000 - Math.round(Math.abs(x)));
      card.classList.toggle('is-wheel-focus', Math.abs(x) < step / 2);
      card.setAttribute('aria-label', `${card.querySelector('b')?.textContent || ''} ${card.querySelector('small')?.textContent || ''}`.trim());
    });
    track.style.transform = `translateZ(0)`;
  };

  const animate = (now) => {
    if (!previous) previous = now;
    const elapsed = Math.min(50, now - previous);
    previous = now;
    if (!paused && !reducedMotion.matches) {
      distance += elapsed * 0.012;
      draw();
    }
    frame = requestAnimationFrame(animate);
  };

  stage.addEventListener('mouseenter', () => { paused = true; });
  stage.addEventListener('mouseleave', () => { paused = false; previous = 0; });
  stage.addEventListener('focusin', () => { paused = true; });
  stage.addEventListener('focusout', () => { paused = false; previous = 0; });
  stage.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, dragging: false };
    suppressClick = false;
    paused = true;
  });
  stage.addEventListener('pointermove', (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.lastX;
    pointer.lastX = event.clientX;
    if (!pointer.dragging) {
      const totalX = event.clientX - pointer.startX;
      const totalY = event.clientY - pointer.startY;
      if (Math.abs(totalX) < 5) return;
      if (Math.abs(totalY) > Math.abs(totalX)) { pointer = null; paused = false; return; }
      pointer.dragging = true;
      stage.classList.add('is-dragging');
      stage.setPointerCapture?.(event.pointerId);
    }
    distance += dx;
    draw();
  });
  const finishPointer = (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dragged = pointer.dragging;
    pointer = null;
    stage.classList.remove('is-dragging');
    if (dragged) {
      suppressClick = true;
      window.setTimeout(() => { suppressClick = false; }, 0);
      if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    }
    paused = stage.matches(':hover') || stage.contains(document.activeElement);
    previous = 0;
  };
  stage.addEventListener('pointerup', finishPointer);
  stage.addEventListener('pointercancel', finishPointer);
  stage.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);
  stage.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const cardWidth = window.matchMedia('(max-width: 410px)').matches ? 154 : window.matchMedia('(max-width: 760px)').matches ? 164 : 190;
    const step = cardWidth + (window.matchMedia('(max-width: 760px)').matches ? 17 : 21);
    distance += event.key === 'ArrowLeft' ? step : -step;
    paused = true;
    draw();
  });
  reducedMotion.addEventListener?.('change', draw);
  window.addEventListener('resize', draw, { passive: true });
  draw();
  frame = requestAnimationFrame(animate);
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
})();
