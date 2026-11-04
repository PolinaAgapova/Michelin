// Petite boîte à outils SVG partagée par les trois directions.
// Tout est vectoriel et déterministe (graine fixe) : le rendu est identique à chaque export.
window.B = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const inRect = (x, y, r) => r && x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

  function defs(svg, color = '#f2ecdf') {
    const d = el('defs', {}, svg);
    const g = el('radialGradient', { id: 'glow' }, d);
    el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.85' }, g);
    el('stop', { offset: '35%', 'stop-color': color, 'stop-opacity': '.18' }, g);
    el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }, g);
    return d;
  }

  // Étoile : point + halo optionnel + aigrettes fines pour les plus brillantes.
  function star(p, x, y, r, o, color = '#f2ecdf', bright = false) {
    if (bright) {
      el('circle', { cx: x, cy: y, r: r * 7, fill: 'url(#glow)', opacity: o * .8 }, p);
      const L = r * 9;
      el('line', { x1: x - L, y1: y, x2: x + L, y2: y, stroke: color, 'stroke-width': .6, 'stroke-opacity': o * .55 }, p);
      el('line', { x1: x, y1: y - L, x2: x, y2: y + L, stroke: color, 'stroke-width': .6, 'stroke-opacity': o * .55 }, p);
    }
    el('circle', { cx: x, cy: y, r, fill: color, opacity: o }, p);
  }

  // avoid : un rectangle ou une liste de rectangles où les étoiles sont atténuées (facteur k) et jamais brillantes.
  function field(p, { seed = 1, n = 300, w = 1584, h = 396, avoid, k = .35, color } = {}) {
    const R = rng(seed), zones = [].concat(avoid || []);
    for (let i = 0; i < n; i++) {
      const x = R() * w, y = R() * h, m = R();
      const z = zones.find(r => inRect(x, y, r));
      const r = m > .992 ? 1.7 : m > .95 ? 1.15 : m > .7 ? .8 : .55;
      let o = .18 + R() * .55;
      if (z) o *= z.k ?? k;
      star(p, x, y, z ? Math.min(r, .8) : r, o, color, m > .992 && !z);
    }
  }

  function text(p, x, y, str, attrs = {}) {
    const t = el('text', { x, y, ...attrs }, p);
    t.textContent = str;
    return t;
  }

  return { NS, el, rng, clamp, smooth, defs, star, field, text, inRect };
})();
