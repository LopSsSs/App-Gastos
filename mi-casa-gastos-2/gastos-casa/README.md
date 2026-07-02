# Mi Casa · Gastos del hogar (PWA premium)

App de control de gastos domésticos con gráfica interactiva, categorías personalizables y consejo mensual de ahorro con IA (Gemini).

## Cómo subirla a Netlify (2 minutos)

1. Entra en https://app.netlify.com
2. Ve a "Sites" → arrastra **toda esta carpeta descomprimida** a la zona de "drag and drop" (o usa "Add new site → Deploy manually").
3. Netlify te dará una URL tipo `https://loquesea.netlify.app`. Puedes cambiar el nombre en Site settings → Change site name (por ejemplo `micasa-gastos`).

## Instalarla en el móvil como app

1. Abre la URL de Netlify en Chrome (Android).
2. Menú ⋮ → "Añadir a pantalla de inicio" / "Instalar aplicación".
3. Se instala con icono propio y funciona incluso sin conexión (los datos se guardan en el móvil, en localStorage).

## Activar el consejo de IA (Gemini)

1. Entra en https://aistudio.google.com → "Get API key" → crea una clave gratuita.
2. En la app, toca el botón ⚙ (arriba a la derecha) y pega la clave. Se guarda solo en tu dispositivo.
3. Al final del mes (o cuando quieras), pulsa "Pedir consejo a Gemini": analiza tus gastos reales del mes y te da recomendaciones para ahorrar.

## Qué incluye

- 5 apartados por defecto: Comida, Regalos, Ropa, Gastos fijos, Comer fuera.
- Botón ＋ para crear tus propios apartados (con emoji y color automático).
- Total por apartado + donut interactivo (toca los sectores para ver importe y %).
- Navegación por meses ‹ › para consultar histórico.
- Toca un apartado para ver/borrar sus movimientos; las categorías creadas por ti se pueden eliminar.
- Botones con relieve (neumorfismo), paleta índigo/oro champán y aurora animada de fondo (respeta "reducir movimiento" del sistema).

## Nube (opcional)

Mira el archivo SUPABASE.md: con 3 pasos conectas la app a Supabase (gratis) y tus datos se sincronizan entre móvil y PC.

## Nota sobre los datos

Todo se guarda en localStorage del navegador/móvil. Si borras los datos del navegador, se pierden los gastos. Si más adelante quieres sincronización en la nube, se puede conectar a Supabase igual que tus otras apps.
