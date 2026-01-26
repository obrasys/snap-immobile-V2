export function propertyCoverUrl(seed: string) {
  // Imagens externas para dar "mood" (sem gradiente). Seed mantém consistência.
  const s = encodeURIComponent(seed);
  return `https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80&sig=${s}`;
}

export function welcomeBackgroundUrl() {
  return "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80";
}
