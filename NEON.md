# La nube de "Mi Casa" (Neon + Netlify)

Los gastos se guardan en una base de datos **Neon** (Postgres). La app **no** habla
con la base de datos directamente: llama a `/api/db/<tabla>`, una función serverless
que corre en Netlify y es la única que conoce la contraseña.

```
Móvil / PC  →  /api/db/gastos_casa  →  netlify/functions/db.mjs  →  Neon
   (código de acceso)                    (DATABASE_URL, en Netlify)
```

Así la contraseña de la base de datos nunca sale del servidor. En el móvil solo se
guarda un **código de acceso**, que es lo que la función comprueba antes de responder.

## 1. Variables de entorno en Netlify

En Netlify → tu proyecto → **Site configuration → Environment variables**, tienen que
existir estas dos (ambas marcadas como secretas):

| Variable       | Qué es                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL` | La cadena de conexión de Neon. Está en console.neon.tech → proyecto **App-Gastos** → **Connect** |
| `APP_TOKEN`    | El código de acceso que pegas en la app. Cualquier texto largo y difícil de adivinar |

> Ninguna de las dos se guarda en este repositorio: es público.

Si falta cualquiera de las dos, la función responde 500 y no deja pasar a nadie.

> **Importante: no marques "Contains secret values" al crearlas.** Netlify no pasa el
> valor de las variables secretas al runtime de las funciones: llegan con el nombre
> puesto pero vacías, y la app da un 500 diciendo que faltan. Si una ya está creada
> como secreta hay que **borrarla y crearla de nuevo**; editarla no quita esa marca.

## 2. Pegar el código en cada dispositivo

Abre la app → botón ⚙ → **Nube (Neon)** → pega el mismo valor que pusiste en
`APP_TOKEN` → Guardar. El puntito junto a "Mi Casa" se pondrá **verde**.

Hay que hacerlo una vez en cada dispositivo (móvil y PC). El código se guarda solo
en ese dispositivo.

## 3. Las tablas

Ya están creadas en Neon. Si algún día necesitas rehacerlas desde cero, este es el SQL:

```sql
create table if not exists apartados_casa (
  id text primary key,
  nombre text not null,
  emoji text default '💶',
  color text default '#B08CE0',
  creado timestamptz default now()
);

create table if not exists gastos_casa (
  id text primary key,
  apartado text not null,
  importe numeric(10,2) not null,
  fecha timestamptz not null default now()
);

create table if not exists tickets_casa (
  id text primary key,
  comercio text,
  fecha date,
  total numeric(10,2) default 0,
  descuento numeric(10,2) default 0,
  iva numeric(10,2) default 0,
  lineas jsonb not null default '[]',
  creado timestamptz default now()
);

create table if not exists productos_casa (
  id text primary key,
  nombre text not null,
  alias jsonb default '[]',
  cantidad numeric default 0,
  gasto numeric(10,2) default 0,
  compras int default 0,
  precio_medio numeric(10,4) default 0,
  ultima_compra date,
  ultima_tienda text,
  historial jsonb default '[]',
  actualizado timestamptz default now()
);

create index if not exists gastos_casa_fecha_idx on gastos_casa (fecha desc);
create index if not exists gastos_casa_apartado_idx on gastos_casa (apartado);
create index if not exists tickets_casa_fecha_idx on tickets_casa (fecha desc);
```

`productos_casa` es una copia consultable. La fuente de verdad son los tickets: la app
recalcula los acumulados a partir de ellos, así nunca se corrompen entre dispositivos.
Se puede vaciar sin perder nada.

## 4. Cómo funciona la sincronización

- Cada gasto se guarda al instante en el móvil y se sube en segundo plano.
- Sin conexión, se guarda en el móvil y el puntito se pone rojo; la operación queda
  en una cola que se reintenta sola al recuperar internet.
- Lo que borras en un dispositivo no resucita en otro (la app lleva "lápidas" de los
  ids borrados durante 90 días).

## 5. Probar la API

Con las dos variables a mano:

```bash
DATABASE_URL='postgresql://…' APP_TOKEN='…' node tests/db.test.mjs
```

Ejercita las lecturas, el upsert, los borrados y las defensas (código incorrecto,
tablas y columnas fuera de la lista blanca, intentos de inyección) contra la base
real. Solo toca filas cuyo id empieza por `__test_` y las borra al terminar.

## 6. Qué entiende `/api/db`

Habla el mismo dialecto que usaba Supabase, así que el cliente apenas cambió:

| Petición                                            | Efecto                          |
| --------------------------------------------------- | ------------------------------- |
| `GET /api/db/gastos_casa?select=*&order=fecha.desc&limit=5000` | Leer                  |
| `POST /api/db/gastos_casa` con un objeto o un array  | Insertar, o actualizar si el id ya existe |
| `DELETE /api/db/gastos_casa?id=eq.123`               | Borrar esa fila                 |
| `DELETE /api/db/productos_casa?id=neq.__none__`      | Vaciar la tabla                 |

Solo son alcanzables las cuatro tablas de la app y sus columnas; los filtros aceptan
`eq` y `neq`, y un `DELETE` sin filtro se rechaza.
