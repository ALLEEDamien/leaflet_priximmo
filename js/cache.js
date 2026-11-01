// GET JSON avec cache navigateur (Cache API) : 1re fois réseau, ensuite instantané
import { CACHE_NAME, CACHE_TTL } from './config.js';

// Le cache est vidé uniquement quand le serveur (server.py) a été relancé : /__session renvoie un id propre à chaque lancement.
// F5 ne vide rien. Sans server.py (404, autre serveur), le cache est simplement conservé.
async function clearCacheIfServerRestarted() {
  try {
    const { id } = await (await fetch('/__session', { cache: 'no-store' })).json();
    if (localStorage.getItem('session-id') !== id) {
      await caches.delete(CACHE_NAME);
      localStorage.setItem('session-id', id);
    }
  } catch { /* pas de /__session ou stockage indisponible */ }
}
const cacheReady = clearCacheIfServerRestarted();

export async function cachedJson(url) {
  await cacheReady;
  let cache = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit && Date.now() - Number(hit.headers.get('x-cached-at')) < CACHE_TTL) return hit.json();
  } catch { /* Cache API indisponible : on passe par le réseau */ }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  if (cache) {
    const body = await res.clone().text();
    cache.put(url, new Response(body, { headers: { 'content-type': 'application/json', 'x-cached-at': String(Date.now()) } })).catch(() => {});
  }
  return res.json();
}
