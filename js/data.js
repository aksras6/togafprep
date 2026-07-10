/**
 * data.js — shared data loader
 * Loads JSON files once and caches in memory.
 */

const cache = {};

export async function getData(name) {
  if (cache[name]) return cache[name];
  const res = await fetch(`data/${name}.json`);
  if (!res.ok) throw new Error(`Failed to load data/${name}.json (${res.status})`);
  const json = await res.json();
  cache[name] = json;
  return json;
}

/**
 * Load a lesson from data/lessons/<slug>.json
 */
export async function getLesson(slug) {
  const cacheKey = `lesson::${slug}`;
  if (cache[cacheKey]) return cache[cacheKey];
  const res = await fetch(`data/lessons/${slug}.json`);
  if (!res.ok) throw new Error(`Failed to load lesson "${slug}" (${res.status})`);
  const json = await res.json();
  cache[cacheKey] = json;
  return json;
}
