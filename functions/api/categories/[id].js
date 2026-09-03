import { getCategories, saveCategories, json } from '../_shared.js';

export async function onRequestPut({ request, env, params }) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) return json({ error: 'El nombre no puede estar vacío.' }, 400);

    const categories = await getCategories(env);
    const cat = categories.find((c) => c.id === params.id);
    if (!cat) return json({ error: 'Categoría no encontrada.' }, 404);

    cat.name = name;
    await saveCategories(env, categories);
    return json({ categories });
  } catch (err) {
    return json({ error: 'No se pudo renombrar la categoría: ' + err.message }, 500);
  }
}
