/* API de datos de "Mi Casa" sobre Neon.
   Habla el mismo dialecto que usaba Supabase (PostgREST) para que el cliente
   apenas cambie: GET con ?select/order/limit, POST que hace upsert por id y
   DELETE con filtros ?columna=eq.valor / ?columna=neq.valor.

   La contraseña de la base de datos vive en DATABASE_URL (variables de entorno
   de Netlify) y nunca sale del servidor. El acceso se protege con APP_TOKEN,
   que la app envía en la cabecera Authorization. */

import { neon } from '@neondatabase/serverless';

export const config = { path: '/api/db/:tabla' };

const sql = neon(process.env.DATABASE_URL);

/* Solo estas tablas y estas columnas son alcanzables desde fuera. Los nombres
   de tabla y columna no se pueden parametrizar en SQL, así que la única
   defensa contra inyección es esta lista blanca. */
const TABLAS = {
  apartados_casa: {
    cols: ['id', 'nombre', 'emoji', 'color', 'creado'],
    json: [],
  },
  gastos_casa: {
    cols: ['id', 'apartado', 'importe', 'fecha'],
    json: [],
  },
  tickets_casa: {
    cols: ['id', 'comercio', 'fecha', 'total', 'descuento', 'iva', 'lineas', 'creado'],
    json: ['lineas'],
  },
  productos_casa: {
    cols: ['id', 'nombre', 'alias', 'cantidad', 'gasto', 'compras', 'precio_medio',
           'ultima_compra', 'ultima_tienda', 'historial', 'actualizado'],
    json: ['alias', 'historial'],
  },
};

const OPS = { eq: '=', neq: '<>' };

const error = (status, msg) =>
  new Response(JSON.stringify({ message: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/* ?id=eq.123&apartado=neq.comida -> WHERE "id" = $1 and "apartado" <> $2 */
function construirWhere(def, params, valores) {
  const trozos = [];
  for (const [clave, bruto] of params) {
    if (clave === 'select' || clave === 'order' || clave === 'limit') continue;
    if (!def.cols.includes(clave)) throw new Error(`columna desconocida: ${clave}`);
    const punto = bruto.indexOf('.');
    const op = punto < 0 ? '' : bruto.slice(0, punto);
    if (!OPS[op]) throw new Error(`operador no soportado: ${bruto}`);
    valores.push(bruto.slice(punto + 1));
    trozos.push(`"${clave}" ${OPS[op]} $${valores.length}`);
  }
  return trozos.length ? ' where ' + trozos.join(' and ') : '';
}

/* ?order=fecha.desc -> ORDER BY "fecha" desc */
function construirOrden(def, params) {
  const bruto = params.get('order');
  if (!bruto) return '';
  const [col, dir = 'asc'] = bruto.split('.');
  if (!def.cols.includes(col)) throw new Error(`columna desconocida: ${col}`);
  if (dir !== 'asc' && dir !== 'desc') throw new Error(`orden no soportado: ${dir}`);
  return ` order by "${col}" ${dir}`;
}

function construirLimite(params) {
  const bruto = params.get('limit');
  if (!bruto) return '';
  const n = parseInt(bruto, 10);
  if (!Number.isInteger(n) || n < 1 || n > 100000) throw new Error('limit no válido');
  return ` limit ${n}`;
}

export default async (req, context) => {
  const esperado = process.env.APP_TOKEN;
  if (esperado) {
    const dado = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (dado !== esperado) return error(401, 'código de acceso incorrecto');
  }

  const tabla = context.params.tabla;
  const def = TABLAS[tabla];
  if (!def) return error(404, `tabla desconocida: ${tabla}`);

  const params = new URL(req.url).searchParams;

  try {
    if (req.method === 'GET') {
      const valores = [];
      const texto = `select * from "${tabla}"` + construirWhere(def, params, valores) +
                    construirOrden(def, params) + construirLimite(params);
      const filas = await sql.query(texto, valores);
      return Response.json(filas);
    }

    if (req.method === 'POST') {
      const cuerpo = await req.json();
      const filas = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
      if (!filas.length) return new Response(null, { status: 204 });

      // Unión de las claves enviadas: lo que no venga conserva su valor o su default.
      const cols = def.cols.filter(c => filas.some(f => c in f));
      if (!cols.includes('id')) return error(400, 'falta la columna id');

      const valores = [];
      const tuplas = filas.map(f => '(' + cols.map(c => {
        valores.push(def.json.includes(c) ? JSON.stringify(f[c] ?? null) : (f[c] ?? null));
        return `$${valores.length}` + (def.json.includes(c) ? '::jsonb' : '');
      }).join(',') + ')');

      const actualiza = cols.filter(c => c !== 'id')
        .map(c => `"${c}" = excluded."${c}"`).join(',');
      const texto = `insert into "${tabla}" (${cols.map(c => `"${c}"`).join(',')})` +
        ` values ${tuplas.join(',')} on conflict ("id") do ` +
        (actualiza ? `update set ${actualiza}` : 'nothing');

      await sql.query(texto, valores);
      return new Response(null, { status: 204 });
    }

    if (req.method === 'DELETE') {
      const valores = [];
      const filtro = construirWhere(def, params, valores);
      if (!filtro) return error(400, 'un DELETE necesita al menos un filtro');
      await sql.query(`delete from "${tabla}"` + filtro, valores);
      return new Response(null, { status: 204 });
    }

    return error(405, `método no soportado: ${req.method}`);
  } catch (e) {
    return error(400, e.message || 'error de base de datos');
  }
};
