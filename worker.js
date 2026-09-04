// ------------------------------------------------------------------
// Tablero Informativo — Worker único (API + estáticos)
// ------------------------------------------------------------------

const PALETTE = ['#C9A227','#2F6F63','#3B4C7A','#7A3B4C','#6B7A3B','#8A4B2E','#4B5A6B','#9C6B2E'];

const DEFAULT_CATEGORIES = [
  { id: 'avisos',     name: 'Avisos Generales',        color: '#C9A227' },
  { id: 'procesos',   name: 'Procesos y Trámites',      color: '#2F6F63' },
  { id: 'formatos',   name: 'Formatos y Plantillas',    color: '#3B4C7A' },
  { id: 'circulares', name: 'Circulares',               color: '#7A3B4C' },
  { id: 'soporte',    name: 'Soporte y Capacitación',   color: '#6B7A3B' },
  { id: 'eventos',    name: 'Eventos y Fechas Clave',   color: '#8A4B2E' },
];

const MAX_ATTACHMENTS_BYTES = 8 * 1024 * 1024; // 8 MB en crudo por tarjeta

// Se completa cuando Jorge suba el logo institucional (como data URI base64).
const LOGO_DATA_URI = '';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function nextColor(categories) {
  return PALETTE[categories.length % PALETTE.length];
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function excerpt(text, n = 110) {
  return text.length > n ? text.slice(0, n).trim() + '…' : text;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getAuthors(env) {
  const raw = await env.TABLERO_KV.get('authors');
  return raw ? JSON.parse(raw) : [];
}
async function saveAuthors(env, authors) {
  await env.TABLERO_KV.put('authors', JSON.stringify(authors));
}

async function getCategories(env) {
  const raw = await env.TABLERO_KV.get('categories');
  if (raw) return JSON.parse(raw);
  await env.TABLERO_KV.put('categories', JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}
async function saveCategories(env, categories) {
  await env.TABLERO_KV.put('categories', JSON.stringify(categories));
}

async function getCardIndex(env) {
  const raw = await env.TABLERO_KV.get('card_index');
  return raw ? JSON.parse(raw) : [];
}
async function saveCardIndex(env, index) {
  await env.TABLERO_KV.put('card_index', JSON.stringify(index));
}

async function getCard(env, id) {
  const raw = await env.TABLERO_KV.get('card:' + id);
  return raw ? JSON.parse(raw) : null;
}
async function saveCard(env, card) {
  await env.TABLERO_KV.put('card:' + card.id, JSON.stringify(card));
}
async function deleteCard(env, id) {
  await env.TABLERO_KV.delete('card:' + id);
}

function toSummary(card) {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // GET /api/data — carga inicial (categorías + índice liviano de tarjetas)
      if (path === '/api/data' && method === 'GET') {
        const categories = await getCategories(env);
        const cards = await getCardIndex(env);
        const authors = await getAuthors(env);
        return json({ categories, cards, authors, logoUrl: LOGO_DATA_URI || null });
      }

      // POST /api/categories — crear categoría
      if (path === '/api/categories' && method === 'POST') {
        const body = await request.json();
        const name = (body.name || '').trim();
        if (!name) return json({ error: 'El nombre de la categoría es obligatorio.' }, 400);

        const categories = await getCategories(env);
        const id = 'cat_' + Date.now();
        categories.push({ id, name, color: nextColor(categories) });
        await saveCategories(env, categories);
        return json({ categories, newId: id });
      }

      // PUT /api/categories/:id — renombrar categoría
      const catMatch = path.match(/^\/api\/categories\/([^/]+)$/);
      if (catMatch && method === 'PUT') {
        const id = decodeURIComponent(catMatch[1]);
        const body = await request.json();
        const name = (body.name || '').trim();
        if (!name) return json({ error: 'El nombre no puede estar vacío.' }, 400);

        const categories = await getCategories(env);
        const cat = categories.find((c) => c.id === id);
        if (!cat) return json({ error: 'Categoría no encontrada.' }, 404);
        cat.name = name;
        await saveCategories(env, categories);
        return json({ categories });
      }

      // GET /api/cards — listado liviano (alias de /api/data para las tarjetas)
      if (path === '/api/cards' && method === 'GET') {
        const cards = await getCardIndex(env);
        return json({ cards });
      }

      // POST /api/cards — publicar tarjeta nueva
      if (path === '/api/cards' && method === 'POST') {
        const form = await request.formData();
        const title = (form.get('title') || '').toString().trim();
        const author = (form.get('author') || '').toString().trim();
        const bodyText = (form.get('body') || '').toString().trim();
        let catId = (form.get('catId') || '').toString();
        const newCategoryName = (form.get('newCategoryName') || '').toString().trim();

        if (!title || !author || !bodyText) {
          return json({ error: 'Título, tu nombre y el contenido son obligatorios.' }, 400);
        }

        const categories = await getCategories(env);

        if (catId === '__new__') {
          if (!newCategoryName) {
            return json({ error: 'Escribe un nombre para la nueva categoría.' }, 400);
          }
          const id = 'cat_' + Date.now();
          categories.push({ id, name: newCategoryName, color: nextColor(categories) });
          await saveCategories(env, categories);
          catId = id;
        } else if (!categories.find((c) => c.id === catId)) {
          return json({ error: 'Categoría inválida.' }, 400);
        }

        const files = form.getAll('files').filter((f) => f instanceof File && f.size > 0);
        const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
        if (totalBytes > MAX_ATTACHMENTS_BYTES) {
          const maxMb = (MAX_ATTACHMENTS_BYTES / (1024 * 1024)).toFixed(0);
          return json({
            error: `Los archivos adjuntos suman demasiado (máximo ${maxMb} MB por tarjeta). Reduce el tamaño o divide la información en varias tarjetas.`,
          }, 400);
        }

        const attachments = [];
        for (const file of files) {
          const safeName = sanitizeFilename(file.name);
          const ext = safeName.includes('.') ? safeName.split('.').pop().toUpperCase().slice(0, 4) : 'FILE';
          const buf = await file.arrayBuffer();
          attachments.push({
            name: file.name,
            ext,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            dataBase64: arrayBufferToBase64(buf),
          });
        }

        const card = {
          id: crypto.randomUUID(),
          catId, title, author, body: bodyText,
          date: new Date().toISOString().slice(0, 10),
          attachments,
        };
        await saveCard(env, card);

        const index = await getCardIndex(env);
        const summary = toSummary(card);
        index.push(summary);
        await saveCardIndex(env, index);

        const authors = await getAuthors(env);
        if (!authors.includes(author)) {
          authors.push(author);
          await saveAuthors(env, authors);
        }

        return json({ card: summary, categories, authors });
      }

      // GET /api/cards/:id — detalle completo (con adjuntos)
      const cardMatch = path.match(/^\/api\/cards\/([^/]+)$/);
      if (cardMatch && method === 'GET') {
        const id = decodeURIComponent(cardMatch[1]);
        const card = await getCard(env, id);
        if (!card) return json({ error: 'Tarjeta no encontrada.' }, 404);
        return json({ card });
      }

      // DELETE /api/cards/:id — eliminar tarjeta
      if (cardMatch && method === 'DELETE') {
        const id = decodeURIComponent(cardMatch[1]);
        const index = await getCardIndex(env);
        const idx = index.findIndex((c) => c.id === id);
        if (idx === -1) return json({ error: 'Tarjeta no encontrada.' }, 404);
        index.splice(idx, 1);
        await saveCardIndex(env, index);
        await deleteCard(env, id);
        return json({ ok: true });
      }

      // Cualquier otra ruta /api/* que no exista
      if (path.startsWith('/api/')) {
        return json({ error: 'Ruta no encontrada.' }, 404);
      }

      // Si llega aquí, no era un archivo estático conocido
      return new Response('No encontrado', { status: 404 });
    } catch (err) {
      return json({ error: 'Error interno: ' + err.message }, 500);
    }
  },
};
