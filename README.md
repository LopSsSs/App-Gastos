# Mi Casa · Gastos del hogar (PWA premium)

App de control de gastos domésticos con gráfica interactiva, categorías personalizables y consejo mensual de ahorro con IA (Gemini).

## Cómo se publica

La app se despliega en Netlify desde el repositorio `LopSsSs/App-Gastos`: cada push a
`main` publica la versión nueva sola.

Ya no vale arrastrar la carpeta a Netlify: la app incluye una función serverless
(`netlify/functions/db.mjs`) que Netlify tiene que construir, y necesita dos variables
de entorno. Todo eso está explicado en **NEON.md**.

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

## Nube

Los datos viven en **Neon** (Postgres). La app no habla con la base de datos: llama a
`/api/db`, una función que corre en Netlify y guarda ahí la contraseña. En cada
dispositivo solo pegas un código de acceso (⚙ → Nube).

Mira **NEON.md** para el detalle: variables de entorno, tablas y cómo probar la API.

## Nota sobre los datos

Cada gasto se guarda a la vez en el dispositivo (localStorage) y en la nube. Si no hay
internet, se queda en una cola y sube solo al volver la conexión. Si borras los datos
del navegador no pierdes nada mientras el código de acceso siga puesto: al abrir la app
se recarga todo desde Neon.
