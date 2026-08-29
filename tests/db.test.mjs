/* Prueba la función /api/db contra la base real de Neon.
   Uso:  DATABASE_URL=… APP_TOKEN=… node tests/db.test.mjs
   Solo toca filas cuyo id empieza por "__test_", y las borra al terminar. */

const TOKEN = process.env.APP_TOKEN;
const { default: handler } = await import('../netlify/functions/db.mjs');

let ok = 0, fallos = 0;

function llamar(tabla, { method = 'GET', body, token = TOKEN } = {}) {
  const url = new URL('http://local/api/db/' + tabla);
  const [nombre, query] = tabla.split('?');
  url.pathname = '/api/db/' + nombre;
  url.search = query || '';
  return handler(
    new Request(url, {
      method,
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: { tabla: nombre } }
  );
}

async function comprobar(nombre, fn) {
  try {
    await fn();
    ok++;
    console.log('  ok   ' + nombre);
  } catch (e) {
    fallos++;
    console.log('  FALLA ' + nombre + ' -> ' + e.message);
  }
}

const igual = (a, b, que) => {
  if (a !== b) throw new Error(`${que}: esperaba ${b}, recibí ${a}`);
};

console.log('\nLecturas (las tres que hace pullCloud)');
for (const [tabla, min] of [['apartados_casa?select=*', 5],
                            ['gastos_casa?select=*&order=fecha.desc&limit=5000', 72],
                            ['tickets_casa?select=*&order=fecha.desc&limit=5000', 13]]) {
  await comprobar(tabla.split('?')[0], async () => {
    const r = await llamar(tabla);
    igual(r.status, 200, 'status');
    const filas = await r.json();
    if (filas.length < min) throw new Error(`solo ${filas.length} filas, esperaba >= ${min}`);
  });
}

await comprobar('orden descendente respetado', async () => {
  const filas = await (await llamar('gastos_casa?select=*&order=fecha.desc&limit=5000')).json();
  for (let i = 1; i < filas.length; i++)
    if (filas[i - 1].fecha < filas[i].fecha) throw new Error('fechas desordenadas');
});

console.log('\nEscrituras y upsert');
await comprobar('alta de gasto', async () => {
  const r = await llamar('gastos_casa', { method: 'POST',
    body: { id: '__test_g1', apartado: 'comida', importe: 12.5, fecha: '2026-08-29T10:00:00Z' } });
  igual(r.status, 204, 'status');
  const [f] = await (await llamar('gastos_casa?id=eq.__test_g1')).json();
  igual(Number(f.importe), 12.5, 'importe');
});

await comprobar('el POST repetido actualiza en vez de duplicar', async () => {
  await llamar('gastos_casa', { method: 'POST',
    body: { id: '__test_g1', apartado: 'ropa', importe: 99.9, fecha: '2026-08-29T10:00:00Z' } });
  const filas = await (await llamar('gastos_casa?id=eq.__test_g1')).json();
  igual(filas.length, 1, 'nº de filas');
  igual(Number(filas[0].importe), 99.9, 'importe');
  igual(filas[0].apartado, 'ropa', 'apartado');
});

await comprobar('alta por lotes (array)', async () => {
  const r = await llamar('gastos_casa', { method: 'POST', body: [
    { id: '__test_g2', apartado: 'comida', importe: 1, fecha: '2026-08-29T10:00:00Z' },
    { id: '__test_g3', apartado: 'comida', importe: 2, fecha: '2026-08-29T10:00:00Z' },
  ]});
  igual(r.status, 204, 'status');
  igual((await (await llamar('gastos_casa?apartado=eq.comida')).json())
    .filter(f => f.id.startsWith('__test_')).length, 2, 'nº de filas');
});

await comprobar('ticket con lineas jsonb', async () => {
  await llamar('tickets_casa', { method: 'POST', body: {
    id: '__test_t1', comercio: 'Mercadona', fecha: '2026-08-29', total: 30.2,
    descuento: 0, iva: 1.5, lineas: [{ n: 'Leche', q: 2, p: 1.1 }, { n: 'Pan', q: 1, p: 0.9 }] } });
  const [f] = await (await llamar('tickets_casa?id=eq.__test_t1')).json();
  igual(Array.isArray(f.lineas), true, 'lineas es array');
  igual(f.lineas[0].n, 'Leche', 'primera línea');
});

await comprobar('producto con alias e historial jsonb', async () => {
  await llamar('productos_casa', { method: 'POST', body: [{
    id: '__test_p1', nombre: 'Leche', alias: ['leche entera'], cantidad: 2, gasto: 2.2,
    compras: 1, precio_medio: 1.1, ultima_compra: '2026-08-29', ultima_tienda: 'Mercadona',
    historial: [{ d: '2026-08-29', store: 'Mercadona', unit: 1.1, qty: 2, tid: '__test_t1' }],
    actualizado: '2026-08-29T10:00:00Z' }]});
  const [f] = await (await llamar('productos_casa?id=eq.__test_p1')).json();
  igual(f.alias[0], 'leche entera', 'alias');
  igual(f.historial[0].tid, '__test_t1', 'historial');
});

console.log('\nBorrados');
await comprobar('borrar por id', async () => {
  igual((await llamar('gastos_casa?id=eq.__test_g1', { method: 'DELETE' })).status, 204, 'status');
  igual((await (await llamar('gastos_casa?id=eq.__test_g1')).json()).length, 0, 'nº de filas');
});

await comprobar('borrar todos los productos (id=neq.__none__)', async () => {
  igual((await llamar('productos_casa?id=neq.__none__', { method: 'DELETE' })).status, 204, 'status');
  igual((await (await llamar('productos_casa?select=*')).json()).length, 0, 'nº de filas');
});

console.log('\nDefensas');
await comprobar('código de acceso incorrecto -> 401', async () =>
  igual((await llamar('gastos_casa?select=*', { token: 'malo' })).status, 401, 'status'));

await comprobar('sin código de acceso -> 401', async () =>
  igual((await llamar('gastos_casa?select=*', { token: '' })).status, 401, 'status'));

await comprobar('tabla fuera de la lista -> 404', async () =>
  igual((await llamar('pg_user?select=*')).status, 404, 'status'));

await comprobar('columna inventada -> 400', async () =>
  igual((await llamar('gastos_casa?importex=eq.1')).status, 400, 'status'));

await comprobar('operador no soportado -> 400', async () =>
  igual((await llamar('gastos_casa?id=like.*')).status, 400, 'status'));

await comprobar('DELETE sin filtro -> 400', async () =>
  igual((await llamar('gastos_casa', { method: 'DELETE' })).status, 400, 'status'));

await comprobar('intento de inyección en el filtro no rompe nada', async () => {
  const r = await llamar("gastos_casa?id=eq." + encodeURIComponent("x'; drop table gastos_casa;--"));
  igual(r.status, 200, 'status');
  igual((await r.json()).length, 0, 'nº de filas');
  igual((await (await llamar('gastos_casa?select=*')).json()).length >= 72, true, 'la tabla sigue ahí');
});

console.log('\nLimpieza');
for (const t of ['gastos_casa?id=eq.__test_g2', 'gastos_casa?id=eq.__test_g3',
                 'tickets_casa?id=eq.__test_t1'])
  await llamar(t, { method: 'DELETE' });

const quedan = (await (await llamar('gastos_casa?select=*')).json()).filter(f => f.id.startsWith('__test_'));
await comprobar('no quedan filas de prueba', async () => igual(quedan.length, 0, 'nº de filas'));

console.log(`\n${ok} correctas, ${fallos} fallidas`);
process.exit(fallos ? 1 : 0);
