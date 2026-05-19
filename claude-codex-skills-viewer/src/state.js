// Persisted state: favorites, installation timestamps (for NEW badge), recents.
const FAVORITES_KEY = 'ccskills.favorites';
const INSTALL_TIMES_KEY = 'ccskills.installTimes';
const RECENT_KEY = 'ccskills.recent';
const NEW_BADGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let ctx = null;
function init(extensionContext) { ctx = extensionContext; }

function get(key, def) {
  return (ctx && ctx.globalState.get(key, def)) ?? def;
}
function set(key, val) { return ctx && ctx.globalState.update(key, val); }

function favKey(dir) { return dir; }

function isFavorite(dir) {
  const favs = get(FAVORITES_KEY, []);
  return favs.includes(favKey(dir));
}

async function toggleFavorite(dir) {
  const favs = new Set(get(FAVORITES_KEY, []));
  const k = favKey(dir);
  if (favs.has(k)) favs.delete(k); else favs.add(k);
  await set(FAVORITES_KEY, [...favs]);
  return favs.has(k);
}

function listFavorites() { return get(FAVORITES_KEY, []); }

async function markInstalled(dir) {
  const times = get(INSTALL_TIMES_KEY, {});
  times[dir] = Date.now();
  await set(INSTALL_TIMES_KEY, times);
}

function isNew(dir) {
  const times = get(INSTALL_TIMES_KEY, {});
  const t = times[dir];
  if (!t) return false;
  return (Date.now() - t) < NEW_BADGE_MAX_AGE_MS;
}

async function pushRecent(dir) {
  let recents = get(RECENT_KEY, []);
  recents = [dir, ...recents.filter(d => d !== dir)].slice(0, 20);
  await set(RECENT_KEY, recents);
}

function listRecents() { return get(RECENT_KEY, []); }

async function removeInstallTime(dir) {
  const times = get(INSTALL_TIMES_KEY, {});
  delete times[dir];
  await set(INSTALL_TIMES_KEY, times);
}

module.exports = {
  init, isFavorite, toggleFavorite, listFavorites,
  markInstalled, isNew, removeInstallTime,
  pushRecent, listRecents
};
