/**
 * router.js — hash router
 * Supports segments like /modules/:moduleId and /modules/:moduleId/lesson/:slug
 */

const routes = new Map();
let notFoundHandler = null;

export function register(pattern, handler) {
  routes.set(pattern, handler);
}

export function onNotFound(handler) {
  notFoundHandler = handler;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0] || '/';
}

function matchRoute(pattern, path) {
  const pp = pattern.split('/').filter(Boolean);
  const vp = path.split('/').filter(Boolean);
  if (pp.length !== vp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(vp[i]);
    } else if (pp[i] !== vp[i]) {
      return null;
    }
  }
  return params;
}

function dispatch() {
  const path = parseHash();
  for (const [pattern, handler] of routes) {
    const params = matchRoute(pattern, path);
    if (params !== null) {
      handler(params);
      updateActiveNav(path);
      return;
    }
  }
  if (notFoundHandler) notFoundHandler(path);
  updateActiveNav(path);
}

function updateActiveNav(path) {
  document.querySelectorAll('.nav-link').forEach(link => {
    const route = link.dataset.route;
    const isActive = route === path || (route !== '/' && path.startsWith(route));
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

export function navigate(path) {
  location.hash = '#' + path;
}

export function start() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
