import { getCard, deleteCard, getCardIndex, saveCardIndex, json } from '../_shared.js';

export async function onRequestGet({ env, params }) {
  const card = await getCard(env, params.id);
  if (!card) return json({ error: 'Tarjeta no encontrada.' }, 404);
  return json({ card });
}

export async function onRequestDelete({ env, params }) {
  try {
    const index = await getCardIndex(env);
    const idx = index.findIndex((c) => c.id === params.id);
    if (idx === -1) return json({ error: 'Tarjeta no encontrada.' }, 404);

    index.splice(idx, 1);
    await saveCardIndex(env, index);
    await deleteCard(env, params.id);

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'No se pudo eliminar la tarjeta: ' + err.message }, 500);
  }
}
