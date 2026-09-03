# Tablero Informativo — Guía de despliegue (v2, sin el panel de bindings)

## Por qué cambió esto

Cloudflare ya no detecta automáticamente una carpeta `functions/` al conectar un repositorio por Git de la forma en que lo hacía antes con "Pages" — el proyecto queda desplegado solo como archivos estáticos, sin ningún código corriendo detrás, y por eso el botón "Add Binding" no guardaba nada (no había ningún Worker real al que conectarlo).

La solución: todo el backend ahora es **un solo archivo `worker.js`**, y el binding de KV se define directamente en un archivo de configuración (`wrangler.jsonc`) que Cloudflare lee automáticamente desde el repositorio. Ya no hay que tocar el panel de "Bindings" para nada.

## Estructura de archivos

```
wrangler.jsonc      ← configuración: nombre del proyecto, KV, carpeta de estáticos
worker.js           ← todo el backend (API) en un solo archivo
public/
  index.html         ← el frontend (el tablero)
```

## Paso 1 — Sube estos archivos a tu repositorio de GitHub

Reemplaza el contenido del repo `informativo-admisiones` por esta nueva estructura (respetando que `index.html` ahora vive dentro de la carpeta `public/`). Puedes arrastrar la carpeta completa con "Add file → Upload files", o subir archivo por archivo.

Si ya tenías la carpeta `functions/` en el repo, bórrala — ya no se usa.

## Paso 2 — Verifica el ID del KV namespace

El archivo `wrangler.jsonc` ya trae tu ID de KV cargado:

```
769ae7a0d96747f0a51ef8d0f522dcd6
```

Si en algún momento creas un namespace nuevo, el ID se ve en el dashboard: **Storage & Databases → KV → clic en el namespace → copiar el "Namespace ID"** que aparece ahí.

## Paso 3 — Espera (o dispara) el redeploy

En cuanto subas los cambios a GitHub, Cloudflare debería iniciar un nuevo despliegue automáticamente (pestaña **Deployments**). Si no arranca solo, hay un botón para disparar un despliegue manual ahí mismo.

## Paso 4 — Confirma que el binding quedó activo

Entra a la pestaña **Bindings** del proyecto. Ahora deberías ver el KV namespace `TABLERO_KV` conectado automáticamente — viene del archivo `wrangler.jsonc`, no hace falta agregarlo a mano.

## Paso 5 — Abre el link y prueba

Visita la URL de tu proyecto (botón "Visit" en el dashboard) y prueba crear una tarjeta de ejemplo para confirmar que todo quedó conectado.

---

## Notas técnicas

- Categorías y tarjetas viven en KV: `categories`, `card_index` (resumen liviano) y una llave `card:<id>` por cada tarjeta completa (con sus adjuntos en base64).
- Límite de 8 MB en total de archivos adjuntos por tarjeta.
- No hay login: cualquiera con el link puede ver, publicar y borrar tarjetas. Queda registrado el nombre de quien publicó cada una.
- Cualquier cambio futuro al código: edita `worker.js` o `public/index.html` directamente en GitHub y sube el cambio — Cloudflare redespliega solo.
