const REFRESH_TTL_MS = 21600000;
const FETCH_LIMIT = 50;
const DISPLAY_LIMIT = 20;

const parseIsoMs = (iso) => {
  const ms = Date.parse(iso || '');
  return Number.isFinite(ms) ? ms : 0;
};

function mergeSlidingWindow(incoming = [], existingPool = [], displayLimit = DISPLAY_LIMIT) {
  const byId = new Map();
  for (const r of [...existingPool, ...incoming]) {
    if (!r) continue;
    const publishTime = r.publishTime || r.iso_date || new Date(0).toISOString();
    const authorName = r.authorName || r.authorAttribution?.displayName || r.user?.name || 'Autor Google';
    const reviewId = String(r.reviewId || r.name || r.review_id || `${r.authorUri || r.authorAttribution?.uri || authorName}::${publishTime}`);
    const text = String(r.text?.text || r.originalText?.text || (typeof r.text === 'string' ? r.text : '') || r.snippet || '').trim();
    byId.set(reviewId, {
      reviewId,
      authorName,
      authorUri: r.authorUri || r.authorAttribution?.uri || r.user?.link || '',
      authorPhoto: r.authorPhoto || r.authorAttribution?.photoUri || r.user?.thumbnail || '',
      guideBadge: r.guideBadge || (r.user?.local_guide ? 'Local Guide · Google Maps' : ''),
      rating: Number(r.rating ?? 0),
      text,
      relativeTime: r.relativeTime || r.relativePublishTimeDescription || r.date || 'Recente no Google',
      publishTime: new Date(parseIsoMs(publishTime)).toISOString()
    });
  }
  const recentPool = Array.from(byId.values())
    .sort((a, b) => parseIsoMs(b.publishTime) - parseIsoMs(a.publishTime))
    .slice(0, FETCH_LIMIT);
  const fiveStarLatest = recentPool.filter((r) => r.rating === 5 && Boolean(r.text?.trim())).slice(0, displayLimit);
  return { recentPool, fiveStarLatest };
}

async function fetchUpstreamReviews(env) {
  if (env.SERPAPI_API_KEY && (env.GOOGLE_PLACE_ID || env.GOOGLE_DATA_ID)) {
    const qs = new URLSearchParams({ engine: 'google_maps_reviews', sort_by: 'newestScore', hl: 'pt-br', api_key: env.SERPAPI_API_KEY });
    if (env.GOOGLE_DATA_ID) qs.set('data_id', env.GOOGLE_DATA_ID); else qs.set('place_id', env.GOOGLE_PLACE_ID);
    const res = await fetch(`https://serpapi.com/search.json?${qs}`);
    if (res.ok) {
      const data = await res.json();
      return { items: data.reviews || [], rating: data.place_info?.rating, userRatingCount: data.place_info?.reviews, placeId: env.GOOGLE_PLACE_ID };
    }
  }
  if (env.GOOGLE_PLACES_API_KEY && env.GOOGLE_PLACE_ID) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(env.GOOGLE_PLACE_ID)}?languageCode=pt-BR`, {
      headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews' }
    });
    if (res.ok) {
      const place = await res.json();
      return { items: place.reviews || [], rating: place.rating, userRatingCount: place.userRatingCount, placeId: place.id || env.GOOGLE_PLACE_ID };
    }
  }
  return null;
}

export async function onRequestGet({ env = {}, request }) {
  const displayLimit = Number(env.DISPLAY_LIMIT || env.MAX_REVIEWS || DISPLAY_LIMIT);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(new URL('/api/google-reviews', request.url).toString());
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  let base = { verified: false, fetchLimit: FETCH_LIMIT, displayLimit, rating: null, userRatingCount: 0, updatedAt: null, reviews: [], recentPool: [] };
  try {
    const assetRes = env.ASSETS ? await env.ASSETS.fetch(new URL('/data/google-reviews.json', request.url)) : null;
    if (assetRes?.ok) base = await assetRes.json();
  } catch { /* fallback KV */ }

  if (env.REVIEWS_KV) {
    const kvData = await env.REVIEWS_KV.get('google_reviews_cache', { type: 'json' });
    if (kvData?.verified && parseIsoMs(kvData.updatedAt) >= parseIsoMs(base.updatedAt)) base = kvData;
  }

  const isStale = !base.verified || (Date.now() - parseIsoMs(base.updatedAt)) >= REFRESH_TTL_MS;
  if (isStale && (env.SERPAPI_API_KEY || env.GOOGLE_PLACES_API_KEY)) {
    const fresh = await fetchUpstreamReviews(env);
    if (fresh) {
      const { recentPool, fiveStarLatest } = mergeSlidingWindow(fresh.items, base.recentPool || base.reviews || [], displayLimit);
      base = {
        verified: true,
        placeId: fresh.placeId || base.placeId || env.GOOGLE_PLACE_ID || '',
        fetchLimit: FETCH_LIMIT,
        displayLimit,
        rating: Number(fresh.rating || base.rating || 4.9),
        userRatingCount: Number(fresh.userRatingCount || base.userRatingCount || recentPool.length),
        updatedAt: new Date().toISOString(),
        reviews: fiveStarLatest,
        recentPool
      };
      if (env.REVIEWS_KV) await env.REVIEWS_KV.put('google_reviews_cache', JSON.stringify(base), { expirationTtl: 604800 });
    }
  }

  const response = new Response(JSON.stringify(base), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400'
    }
  });
  if (cache) await cache.put(cacheKey, response.clone());
  return response;
}

export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, { status: res.status, headers: res.headers });
}
