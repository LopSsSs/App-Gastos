# Conectar la nube (Supabase) — paso a paso

## 1. Crear las tablas

Entra en tu proyecto de Supabase → SQL Editor → pega y ejecuta esto:

```sql
-- Apartados personalizados (los 5 por defecto no se guardan aquí)
create table if not exists apartados_casa (
  id text primary key,
  nombre text not null,
  emoji text default '💶',
  color text default '#B08CE0',
  creado timestamptz default now()
);

-- Gastos
create table if not exists gastos_casa (
  id text primary key,
  apartado text not null,
  importe numeric(10,2) not null,
  fecha timestamptz not null default now()
);

-- Permitir acceso con la anon key (app personal)
alter table apartados_casa enable row level security;
alter table gastos_casa enable row level security;

create policy "acceso_total_apartados" on apartados_casa
  for all using (true) with check (true);

create policy "acceso_total_gastos" on gastos_casa
  for all using (true) with check (true);
```

> Puedes usar tu proyecto existente sin problema: son tablas nuevas y no tocan
> las de Mediterraneum ni las de pedidos. Si prefieres separar lo personal,
> crea un proyecto nuevo gratuito en supabase.com.

## 2. Copiar las credenciales

En Supabase → Settings → API:
- **Project URL** (ej. https://xxxx.supabase.co)
- **anon public key** (la larga que empieza por eyJ…)

## 3. Pegarlas en la app

Abre la app → botón ⚙ → sección "Nube (Supabase)" → pega URL y key → Guardar.
El puntito junto a "Mi Casa" se pondrá **verde** cuando esté sincronizada.

## Cómo funciona la sincronización

- Cada gasto se guarda al instante en el móvil y se sube a la nube en segundo plano.
- Si estás sin conexión, se guarda en el móvil y el puntito se pone rojo; al volver
  a abrir la app con internet se recarga desde la nube.
- La primera vez que conectes la nube, si ya tenías gastos en el móvil, se suben
  automáticamente todos a Supabase.
- Configura la misma URL y key en el PC y verás los mismos datos.

## Nota de seguridad

La anon key es pública por diseño (va en cualquier web con Supabase), pero con la
política "acceso total" cualquiera que la tenga podría leer/escribir esas dos tablas.
Para gastos domésticos es un riesgo asumible; no compartas la URL de tu app con la
key puesta. Si algún día quieres blindarlo, se añade login de Supabase Auth.

## 4. Tablas nuevas: Tickets y Productos (v3)

Para el escáner de tickets y la base de datos de productos, ejecuta esto en el SQL Editor:

```sql
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

alter table tickets_casa enable row level security;
alter table productos_casa enable row level security;

drop policy if exists "acceso_total_tickets" on tickets_casa;
create policy "acceso_total_tickets" on tickets_casa
  for all using (true) with check (true);

drop policy if exists "acceso_total_productos" on productos_casa;
create policy "acceso_total_productos" on productos_casa
  for all using (true) with check (true);
```

Nota: `productos_casa` es una copia consultable (para verla en Supabase o usarla
desde otras apps). La fuente de verdad son los tickets: la app recalcula los
acumulados a partir de ellos, así nunca se corrompen entre dispositivos.
