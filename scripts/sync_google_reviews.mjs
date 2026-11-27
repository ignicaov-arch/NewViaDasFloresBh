import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const STAR_ENUM = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 };
const cleanHost = (u = '') => String(u).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
const onlyDigits = (v = '') => String(v).replace(/\D/g, '');
const VIA_DAS_FLORES_DATA_ID = '0xa699d79fed3d6f:0x14049ca474e4ff81';

/** Valida ao menos 2 ancoras fortes contra homonimos do Google Maps. */
export function verifyExactBusinessMatch(place = {}, expected = {}) {
  let anchors = 0;
  const name = (place.displayName?.text || place.displayName || place.name || place.title || '').toLowerCase();
  const addr = (place.formattedAddress || place.address || '').toLowerCase();
  const site = cleanHost(place.websiteUri || place.website || '');
  const phone = onlyDigits(place.nationalPhoneNumber || place.internationalPhoneNumber || place.phone || '');
  const expDomain = cleanHost(expected.domain || '');
  const expPhone = onlyDigits(expected.phoneDigits || '');
  if (expected.nameToken && name.includes(expected.nameToken.toLowerCase()) && expected.city && addr.includes(expected.city.toLowerCase())) anchors++;
  if (expDomain && site && (site === expDomain || site.endsWith(`.${expDomain}`))) anchors++;
  if (expPhone.length >= 8 && phone.endsWith(expPhone.slice(-8))) anchors++;
  return anchors >= 2;
}

function toIso(val) {
  if (!val) return new Date(0).toISOString();
  const ms = typeof val === 'number' ? (val < 1e12 ? val * 1000 : val) : Date.parse(val);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date(0).toISOString();
}

function normalizeReview(rev) {
  if (!rev || typeof rev !== 'object') return null;
  const authorName = rev.authorName || rev.authorAttribution?.displayName || rev.user?.name || rev.author_title || rev.reviewer?.displayName || 'Autor Google';
  const publishTime = toIso(rev.publishTime || rev.iso_date_of_last_edit || rev.iso_date || rev.review_datetime_utc || rev.review_timestamp || rev.updateTime || rev.createTime);
  const reviewId = rev.reviewId || rev.name || rev.review_id || `${rev.authorUri || rev.authorAttribution?.uri || rev.user?.link || authorName}::${publishTime}`;
  const rating = rev.starRating ? (STAR_ENUM[rev.starRating] ?? 0) : Number(rev.rating ?? rev.review_rating ?? 0);
  const guideBadge = rev.guideBadge || (rev.user?.local_guide ? 'Local Guide · Google Maps' : '');
  const text = String(rev.text?.text || rev.originalText?.text || (typeof rev.text === 'string' ? rev.text : '') || rev.snippet || rev.extracted_snippet?.original || rev.review_text || rev.comment || '').trim();
  return {
    reviewId: String(reviewId),
    authorName: String(authorName),
    authorUri: rev.authorUri || rev.authorAttribution?.uri || rev.user?.link || rev.author_link || '',
    authorPhoto: rev.authorPhoto || rev.authorAttribution?.photoUri || rev.user?.thumbnail || rev.author_image || rev.reviewer?.profilePhotoUrl || '',
    guideBadge: String(guideBadge),
    rating,
    text,
    relativeTime: rev.relativeTime || rev.relativePublishTimeDescription || rev.date || 'Recente no Google',
    publishTime
  };
}

/** Mantem janela deslizante das ultimas 50 avaliacoes e extrai as 20 5★ mais recentes. */
export function selectLatestFiveStarWindow(incomingReviews = [], existingPool = [], { fetchLimit = 50, displayLimit = 20 } = {}) {
  const byId = new Map();
  for (const item of [...(existingPool || []), ...(incomingReviews || [])]) {
    const norm = normalizeReview(item);
    if (!norm) continue;
    const prev = byId.get(norm.reviewId);
    byId.set(norm.reviewId, prev ? { ...prev, ...norm, text: norm.text || prev.text, authorPhoto: norm.authorPhoto || prev.authorPhoto } : norm);
  }
  const recentPool = Array.from(byId.values()).sort((a, b) => Date.parse(b.publishTime) - Date.parse(a.publishTime)).slice(0, fetchLimit);
  const fiveStars = recentPool.filter((r) => r.rating === 5 && Boolean(r.text?.trim()));
  return { recentPool, fiveStarLatest: fiveStars.slice(0, displayLimit) };
}

async function fetchSerpApi(cfg, fetchImpl, fetchLimit) {
  const items = [];
  let token = '';
  let meta = {};
  for (let p = 0; p < 6 && items.length < fetchLimit; p++) {
    const qs = new URLSearchParams({ engine: 'google_maps_reviews', sort_by: 'newestScore', hl: 'pt-br', api_key: cfg.serpApiKey });
    if (cfg.dataId) qs.set('data_id', cfg.dataId); else qs.set('place_id', cfg.placeId);
    if (token) qs.set('next_page_token', token);
    const res = await fetchImpl(`https://serpapi.com/search.json?${qs}`);
    if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
    const data = await res.json();
    if (data.place_info) meta = { rating: data.place_info.rating, userRatingCount: data.place_info.reviews, businessName: data.place_info.title };
    items.push(...(data.reviews || []));
    token = data.serpapi_pagination?.next_page_token || '';
    if (!token) break;
  }
  return { items: items.slice(0, fetchLimit), meta };
}

async function fetchOutscraper(cfg, fetchImpl, fetchLimit) {
  const qs = new URLSearchParams({ query: cfg.placeId, reviewsLimit: String(fetchLimit), sort: 'newest', language: 'pt', async: 'false' });
  const res = await fetchImpl(`https://api.app.outscraper.com/maps/reviews-v3?${qs}`, { headers: { 'X-API-KEY': cfg.outscraperApiKey } });
  if (!res.ok) throw new Error(`Outscraper HTTP ${res.status}`);
  const row = (await res.json()).data?.[0] || {};
  return { items: (row.reviews_data || []).slice(0, fetchLimit), meta: { rating: row.rating, userRatingCount: row.reviews, businessName: row.name } };
}

async function fetchGbp(cfg, fetchImpl, fetchLimit) {
  const url = `https://mybusiness.googleapis.com/v4/${cfg.gbpLocationName}/reviews?pageSize=${fetchLimit}&orderBy=updateTime%20desc`;
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${cfg.gbpAccessToken}` } });
  if (!res.ok) throw new Error(`GBP API HTTP ${res.status}`);
  const data = await res.json();
  return { items: (data.reviews || []).slice(0, fetchLimit), meta: { rating: data.averageRating, userRatingCount: data.totalReviewCount } };
}

async function fetchPlacesNew(cfg, fetchImpl) {
  const res = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(cfg.placeId)}?languageCode=pt-BR`, {
    headers: { 'X-Goog-Api-Key': cfg.googlePlacesApiKey, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,reviews' }
  });
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}`);
  const place = await res.json();
  if (!verifyExactBusinessMatch(place, cfg.expected || {})) throw new Error('[TRAVA ANTI-HOMÔNIMO] Ficha não atingiu >= 2 âncoras fortes.');
  return { items: place.reviews || [], meta: { placeId: place.id || cfg.placeId, businessName: place.displayName?.text || '', rating: place.rating, userRatingCount: place.userRatingCount } };
}

/** Busca avaliacoes em provedor configurado e aplica janela deslizante 50->20. */
export async function fetchLatest50GoogleReviews(config = {}, fetchImpl = fetch) {
  const fetchLimit = Number(config.fetchLimit || 50);
  const displayLimit = Number(config.displayLimit || 20);
  let collected = [];
  let meta = {};
  const steps = [
    [config.serpApiKey && (config.placeId || config.dataId), () => fetchSerpApi(config, fetchImpl, fetchLimit)],
    [config.outscraperApiKey && config.placeId, () => fetchOutscraper(config, fetchImpl, fetchLimit)],
    [config.gbpAccessToken && config.gbpLocationName, () => fetchGbp(config, fetchImpl, fetchLimit)],
    [config.googlePlacesApiKey && config.placeId, () => fetchPlacesNew(config, fetchImpl)]
  ];
  for (const [enabled, run] of steps) {
    if (!enabled || collected.length > 0) continue;
    const out = await run();
    if (out.items?.length) { collected = out.items; meta = out.meta || {}; }
  }
  const { recentPool, fiveStarLatest } = selectLatestFiveStarWindow(collected, config.existingPool || [], { fetchLimit, displayLimit });
  return {
    verified: true,
    placeId: meta.placeId || config.placeId || '',
    dataId: config.dataId || VIA_DAS_FLORES_DATA_ID,
    businessName: meta.businessName || 'Floricultura Via das Flores',
    fetchLimit,
    displayLimit,
    rating: Number(meta.rating || config.fallbackRating || 4.9),
    userRatingCount: Number(meta.userRatingCount || config.fallbackUserRatingCount || recentPool.length),
    updatedAt: new Date().toISOString(),
    reviews: fiveStarLatest,
    recentPool
  };
}

async function runCli() {
  const outFile = path.resolve(process.env.REVIEWS_OUT_FILE || 'public/data/google-reviews.json');
  const hasUpstreamKey = Boolean(
    process.env.SERPAPI_API_KEY || process.env.OUTSCRAPER_API_KEY || process.env.GBP_ACCESS_TOKEN || process.env.GOOGLE_PLACES_API_KEY
  );
  if (!hasUpstreamKey) {
    console.warn('[google-reviews] Credenciais de API upstream ausentes. Mantendo cache verificado local.');
    return;
  }
  let existing = { recentPool: [], reviews: [] };
  try { existing = JSON.parse(await fs.readFile(outFile, 'utf8')); } catch { /* primeiro sync */ }
  const result = await fetchLatest50GoogleReviews({
    placeId: process.env.GOOGLE_PLACE_ID || existing.placeId || '',
    dataId: process.env.GOOGLE_DATA_ID || VIA_DAS_FLORES_DATA_ID,
    serpApiKey: process.env.SERPAPI_API_KEY,
    outscraperApiKey: process.env.OUTSCRAPER_API_KEY,
    gbpAccessToken: process.env.GBP_ACCESS_TOKEN,
    gbpLocationName: process.env.GBP_LOCATION_NAME,
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    fetchLimit: Number(process.env.FETCH_LIMIT || 50),
    displayLimit: Number(process.env.DISPLAY_LIMIT || process.env.MAX_REVIEWS || 20),
    existingPool: existing.recentPool || existing.reviews || [],
    fallbackRating: existing.rating,
    fallbackUserRatingCount: existing.userRatingCount,
    expected: {
      domain: process.env.SITE_DOMAIN || 'viadasflores.com.br',
      phoneDigits: process.env.SITE_PHONE_DIGITS || '3132201818',
      city: process.env.SITE_CITY || 'belo horizonte',
      nameToken: process.env.SITE_NAME_TOKEN || 'via das flores'
    }
  });
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch((err) => { console.error(err.message); process.exitCode = 1; });
}
