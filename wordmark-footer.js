(() => {
  const stage = document.querySelector('[data-wordmark-footer]');
  const word = stage?.querySelector('[data-wordmark-word]');
  if (!stage || !word) return;
  const fragments = [...word.querySelectorAll('[data-wordmark-fragment]')];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lights = fragments.map(() => ({ x: 50, y: 95, targetX: 50, targetY: 95 }));
  let frame = 0;

  const reveal = () => stage.classList.add('is-visible');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    reveal();
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      reveal();
      observer.disconnect();
    }, { threshold: 0.18 });
    observer.observe(stage);
  }

  if (reducedMotion.matches) return;

  const updateLight = () => {
    frame = 0;
    let unsettled = false;
    lights.forEach((light, index) => {
      light.x += (light.targetX - light.x) * 0.22;
      light.y += (light.targetY - light.y) * 0.22;
      fragments[index].style.setProperty('--light-x', `${light.x.toFixed(2)}%`);
      fragments[index].style.setProperty('--light-y', `${light.y.toFixed(2)}%`);
      if (Math.abs(light.targetX - light.x) > 0.1 || Math.abs(light.targetY - light.y) > 0.1) unsettled = true;
    });

    if (unsettled) {
      frame = requestAnimationFrame(updateLight);
    } else {
      stage.classList.remove('is-lit');
    }
  };

  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    fragments.forEach((fragment, index) => {
      const rect = fragment.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      lights[index].targetX = ((event.clientX - rect.left) / rect.width) * 100;
      lights[index].targetY = ((event.clientY - rect.top) / rect.height) * 100;
    });
    stage.classList.add('is-lit');
    if (!frame) frame = requestAnimationFrame(updateLight);
  }, { passive: true });

  stage.addEventListener('pointerleave', () => {
    lights.forEach((light) => {
      light.targetX = 50;
      light.targetY = 95;
    });
    if (!frame) frame = requestAnimationFrame(updateLight);
  }, { passive: true });

  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      if (frame) cancelAnimationFrame(frame);
      reveal();
      fragments.forEach((fragment) => {
        fragment.style.removeProperty('--light-x');
        fragment.style.removeProperty('--light-y');
      });
    }
  });
  window.addEventListener('pagehide', () => {
    if (frame) cancelAnimationFrame(frame);
  }, { once: true });
})();
