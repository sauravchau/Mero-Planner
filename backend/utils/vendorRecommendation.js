const LOCATION_GROUPS = [
  ['kathmandu', 'lalitpur', 'bhaktapur', 'patan', 'kathmandu valley'],
  ['pokhara', 'lakeside', 'begnas', 'begnas lake'],
  ['chitwan', 'bharatpur', 'sauraha'],
  ['biratnagar', 'itahari', 'dharan'],
];

function normalizeLocation(loc) {
  return String(loc || '').trim().toLowerCase();
}

function locationGroupOf(loc) {
  const n = normalizeLocation(loc);
  return LOCATION_GROUPS.find((group) => group.includes(n)) || null;
}

function encodeLocationMatch(userLocation, vendorLocation) {
  const u = normalizeLocation(userLocation);
  const v = normalizeLocation(vendorLocation);
  if (!u) return 1; // no location preference given → don't penalize any vendor
  if (u === v) return 1;
  const group = locationGroupOf(u);
  if (group && group.includes(v)) return 0.6;
  return 0.15;
}

function minMax(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
}

function normalize(value, min, max) {
  if (max === min) return value > 0 ? 1 : 0;
  return (value - min) / (max - min);
}

function dot(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function magnitude(a) {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot(a, b) / (magA * magB);
}

function recommendVendors(prefs, vendors, topN = 5) {
  const budget       = Number(prefs.budget) || 0;
  const guestCapacity = Number(prefs.guest_capacity) || 0;
  const minRating     = Number(prefs.rating) || 0;
  const location       = prefs.location || '';

  
  const eligible = vendors.filter((v) => {
    const cap = Number(v.guest_capacity) || 0;
    const capacityOk = cap === 0 || cap >= guestCapacity;
    const ratingOk = Number(v.rating) >= minRating;
    return capacityOk && ratingOk;
  });

  const pool = eligible.length ? eligible : vendors; // graceful fallback
  const ratingRange   = minMax([...pool.map((v) => Number(v.rating)), 5, 0]);
  const priceRange    = minMax([...pool.map((v) => Number(v.price_npr)), budget]);
  const capacityPool  = pool.map((v) => Number(v.guest_capacity)).filter((c) => c > 0);
  const capacityRange = minMax([...capacityPool, guestCapacity || 1]);

  const userVector = [
    normalize(minRating || Number(ratingRange.max), ratingRange.min, ratingRange.max),
    normalize(budget, priceRange.min, priceRange.max),
    normalize(guestCapacity, capacityRange.min, capacityRange.max),
    1, 
  ];

  const scored = pool.map((v) => {
    const vendorVector = [
      normalize(Number(v.rating), ratingRange.min, ratingRange.max),
      normalize(Number(v.price_npr), priceRange.min, priceRange.max),
      normalize(Number(v.guest_capacity) || guestCapacity, capacityRange.min, capacityRange.max),
      encodeLocationMatch(location, v.location),
    ];

    const similarity = cosineSimilarity(userVector, vendorVector);
    const withinBudget = budget ? Number(v.price_npr) <= budget : true;

    return {
      ...v,
      similarity_score: Math.max(0, Math.min(1, similarity)),
      within_budget: withinBudget,
      location_match: encodeLocationMatch(location, v.location) === 1
        ? 'exact'
        : encodeLocationMatch(location, v.location) === 0.6
          ? 'nearby'
          : 'other',
    };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.similarity_score - a.similarity_score) > 0.0001) {
      return b.similarity_score - a.similarity_score;
    }
    if (a.within_budget !== b.within_budget) {
      return a.within_budget ? -1 : 1;
    }
    return Number(b.rating) - Number(a.rating);
  });

  return scored.slice(0, topN);
}

module.exports = {
  recommendVendors,
  cosineSimilarity,
  normalize,
  encodeLocationMatch,
};
