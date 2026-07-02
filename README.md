# App Gastos

PWA (Progressive Web App) para el control de gastos domésticos, con gráfica interactiva, categorías personalizables, sincronización opcional en la nube (Supabase) y consejo mensual de ahorro con IA (Gemini).

El código de la aplicación está en [`mi-casa-gastos-2/gastos-casa`](mi-casa-gastos-2/gastos-casa).

## Instalación y uso

### Opción 1: abrir en local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/LopSsSs/App-Gastos.git
   cd App-Gastos/mi-casa-gastos-2/gastos-casa
   ```
2. Abre `index.html` directamente en el navegador, o sirve la carpeta con un servidor local (recomendado para que el Service Worker funcione correctamente):
   ```bash
   npx serve .
   ```
3. Entra en la URL que te indique (por ejemplo `http://localhost:3000`).

### Opción 2: desplegar en Netlify (recomendado, 2 minutos)

1. Entra en https://app.netlify.com
2. Ve a "Sites" → "Add new site → Deploy manually" y arrastra la carpeta `mi-casa-gastos-2/gastos-casa`.
3. Netlify te dará una URL tipo `https://loquesea.netlify.app` (puedes personalizarla en Site settings → Change site name).

### Instalar como app en el móvil

1. Abre la URL desplegada en Chrome (Android).
2. Menú ⋮ → "Añadir a pantalla de inicio" / "Instalar aplicación".
3. Queda instalada con icono propio y funciona sin conexión (los datos se guardan en el móvil, en `localStorage`).

### Activar el consejo de IA (Gemini) — opcional

1. Entra en https://aistudio.google.com → "Get API key" → crea una clave gratuita.
2. En la app, pulsa el botón ⚙ y pega la clave (se guarda solo en tu dispositivo).
3. Pulsa "Pedir consejo a Gemini" para recibir recomendaciones de ahorro basadas en tus gastos del mes.

### Sincronización en la nube (Supabase) — opcional

Sigue los pasos de [`SUPABASE.md`](mi-casa-gastos-2/gastos-casa/SUPABASE.md) para conectar la app a un proyecto gratuito de Supabase y sincronizar los datos entre varios dispositivos.

## Nota sobre los datos

Por defecto todo se guarda en `localStorage` del navegador/móvil. Si borras los datos del navegador se pierden los gastos, salvo que hayas activado la sincronización con Supabase.
