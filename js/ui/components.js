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
