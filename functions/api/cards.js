import {
  getCategories, saveCategories, getCardIndex, saveCardIndex, saveCard,
  nextColor, sanitizeFilename, arrayBufferToBase64, toSummary,
  MAX_ATTACHMENTS_BYTES, json,
} from './_shared.js';

export async function onRequestGet({ env }) {
  const cards = await getCardIndex(env);
  return json({ cards });
}

export async function onRequestPost({ request, env }) {
  try {
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
      catId,
      title,
      author,
      body: bodyText,
      date: new Date().toISOString().slice(0, 10),
      attachments,
    };

    await saveCard(env, card);

    const index = await getCardIndex(env);
    const summary = toSummary(card);
    index.push(summary);
    await saveCardIndex(env, index);

    return json({ card: summary, categories });
  } catch (err) {
    return json({ error: 'No se pudo publicar la tarjeta: ' + err.message }, 500);
  }
}
