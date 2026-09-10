// Small DOM helpers shared by every screen.

export const AVATAR_OPTIONS = ['🐬', '🦊', '🐼', '🦄', '🐯', '🐸', '🐧', '🦋', '🐙', '🦁'];

const THEME_COLOR_VARS = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  bg: '--color-bg',
  bgAlt: '--color-bg-alt',
  text: '--color-text',
  textOnPrimary: '--color-text-on-primary',
};

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null) continue;
    el.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(child) : child);
  }
  return el;
}

export function mount(root, node) {
  root.innerHTML = '';
  root.appendChild(node);
}

// Applies a theme's colors as CSS custom properties directly from its JSON
// config, so a brand-new theme works correctly even without an accompanying
// CSS file (the CSS files only add optional decorative background flair).
export function applyThemeColors(themeConfig) {
  document.body.dataset.theme = themeConfig.id;
  const colors = themeConfig.colors || {};
  for (const [key, cssVar] of Object.entries(THEME_COLOR_VARS)) {
    if (colors[key]) document.body.style.setProperty(cssVar, colors[key]);
    else document.body.style.removeProperty(cssVar);
  }
}

export function clearTheme() {
  document.body.dataset.theme = '';
  for (const cssVar of Object.values(THEME_COLOR_VARS)) {
    document.body.style.removeProperty(cssVar);
  }
}

// Pointer Events give one unified drag implementation across mouse, touch
// and pen — native HTML5 drag-and-drop doesn't fire reliably on touch
// devices, which is what these kids actually play on.
function hitTestTargets(dropTargets, x, y) {
  return dropTargets.find(({ el }) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });
}

export function makeDraggable(tileEl, getDropTargets, onDrop) {
  tileEl.addEventListener('pointerdown', (e) => {
    if (tileEl.classList.contains('placed')) return;
    e.preventDefault();
    const dropTargets = getDropTargets();
    const rect = tileEl.getBoundingClientRect();
    const ghost = tileEl.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    document.body.appendChild(ghost);
    tileEl.classList.add('dragging');

    const moveGhost = (x, y) => {
      ghost.style.left = `${x}px`;
      ghost.style.top = `${y}px`;
    };
    moveGhost(e.clientX, e.clientY);

    let lastTarget = null;
    let moved = false;
    const onMove = (ev) => {
      if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6) moved = true;
      moveGhost(ev.clientX, ev.clientY);
      const hit = hitTestTargets(dropTargets, ev.clientX, ev.clientY);
      if (hit !== lastTarget) {
        if (lastTarget) lastTarget.el.classList.remove('drag-over');
        if (hit) hit.el.classList.add('drag-over');
        lastTarget = hit;
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      ghost.remove();
      tileEl.classList.remove('dragging');
      dropTargets.forEach((t) => t.el.classList.remove('drag-over'));
      // A stationary tap (no real movement) is left to the native 'click'
      // event instead: acting on it here — even a same-position drop —
      // mutates the DOM inside the pointerup handler, which in some
      // browsers silently swallows the click event that would otherwise
      // follow, breaking every tap-to-place fallback on the element.
      if (!moved) return;
      const hit = hitTestTargets(dropTargets, ev.clientX, ev.clientY);
      if (hit) onDrop(hit.id);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}
