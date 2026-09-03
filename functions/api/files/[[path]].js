export async function onRequestGet({ env, params }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!key) return new Response('No encontrado', { status: 404 });

  const obj = await env.TABLERO_R2.get(key);
  if (!obj) return new Response('Archivo no encontrado', { status: 404 });

  const filename = key.split('/').pop();
  const headers = new Headers();
  headers.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('content-disposition', `inline; filename="${filename}"`);
  headers.set('cache-control', 'public, max-age=3600');

  return new Response(obj.body, { headers });
}
