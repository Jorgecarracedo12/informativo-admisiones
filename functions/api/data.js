import { getCategories, getCardIndex, json } from './_shared.js';

export async function onRequestGet({ env }) {
  try {
    const categories = await getCategories(env);
    const cards = await getCardIndex(env);
    return json({ categories, cards });
  } catch (err) {
    return json({ error: 'No se pudo cargar la información: ' + err.message }, 500);
  }
}
