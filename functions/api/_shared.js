export const PALETTE = ['#B08A3E','#2F6F63','#3B4C7A','#7A3B4C','#6B7A3B','#8A4B2E','#4B5A6B','#9C6B2E'];

export const DEFAULT_CATEGORIES = [
  { id: 'avisos',     name: 'Avisos Generales',        color: '#B08A3E' },
  { id: 'procesos',   name: 'Procesos y Trámites',      color: '#2F6F63' },
  { id: 'formatos',   name: 'Formatos y Plantillas',    color: '#3B4C7A' },
  { id: 'circulares', name: 'Circulares',               color: '#7A3B4C' },
  { id: 'soporte',    name: 'Soporte y Capacitación',   color: '#6B7A3B' },
  { id: 'eventos',    name: 'Eventos y Fechas Clave',   color: '#8A4B2E' },
];

// Límite conservador para que una tarjeta (con sus adjuntos en base64) no
// se acerque al tope de 25 MB por valor que impone Cloudflare KV.
export const MAX_ATTACHMENTS_BYTES = 8 * 1024 * 1024; // 8 MB en crudo por tarjeta

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function nextColor(categories) {
  return PALETTE[categories.length % PALETTE.length];
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export function excerpt(text, n = 110) {
  return text.length > n ? text.slice(0, n).trim() + '…' : text;
}

export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// --- Categorías ---
export async function getCategories(env) {
  const raw = await env.TABLERO_KV.get('categories');
  if (raw) return JSON.parse(raw);
  await env.TABLERO_KV.put('categories', JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export async function saveCategories(env, categories) {
  await env.TABLERO_KV.put('categories', JSON.stringify(categories));
}

// --- Índice liviano de tarjetas (sin el contenido pesado de los adjuntos) ---
export async function getCardIndex(env) {
  const raw = await env.TABLERO_KV.get('card_index');
  return raw ? JSON.parse(raw) : [];
}

export async function saveCardIndex(env, index) {
  await env.TABLERO_KV.put('card_index', JSON.stringify(index));
}

// --- Tarjeta completa individual (incluye adjuntos en base64) ---
export async function getCard(env, id) {
  const raw = await env.TABLERO_KV.get('card:' + id);
  return raw ? JSON.parse(raw) : null;
}

export async function saveCard(env, card) {
  await env.TABLERO_KV.put('card:' + card.id, JSON.stringify(card));
}

export async function deleteCard(env, id) {
  await env.TABLERO_KV.delete('card:' + id);
}

export function toSummary(card) {
  return {
    id: card.id,
    catId: card.catId,
    title: card.title,
    author: card.author,
    date: card.date,
    excerpt: excerpt(card.body, 110),
    attachments: card.attachments.map((a) => ({ name: a.name, ext: a.ext, size: a.size })),
  };
}
