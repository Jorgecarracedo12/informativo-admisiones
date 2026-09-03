import { getCategories, saveCategories, nextColor, json } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) return json({ error: 'El nombre de la categoría es obligatorio.' }, 400);

    const categories = await getCategories(env);
    const id = 'cat_' + Date.now();
    const color = nextColor(categories);
    categories.push({ id, name, color });
    await saveCategories(env, categories);

    return json({ categories, newId: id });
  } catch (err) {
    return json({ error: 'No se pudo crear la categoría: ' + err.message }, 500);
  }
}
