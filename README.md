# Generador de Mini Videos 🎬

Una aplicación web moderna, rápida y ligera para transformar una galería de fotos en un video animado tipo carrusel con efecto de transición de **derecha a izquierda**, proporción **3:2 (720x480)** y exportación automática en **MP4**.

---

## 📋 Especificaciones y Reglas Cumplidas

1. **Límite de imágenes:** Permite cargar hasta **6 imágenes** simultáneamente o de forma individual.
2. **Límite de peso por imagen:** Las imágenes no pueden superar los **100 KB** (100k). El sistema valida cada archivo y rechaza automáticamente aquellos que excedan este límite con un mensaje explicativo.
3. **Efecto de carrusel:** Las fotos pasan de **derecha a izquierda** con una transición fluida (curva de aceleración cúbica suave).
4. **Límite de peso del video generado:** El video final está optimizado con control dinámico de tasa de bits para no superar nunca los **1.000 KB** (1 MB).
5. **Proporción 3:2 (720x480):** El lienzo y video generado tienen una proporción de 3:2 (resolución de 720 x 480 px), con fondo desenfocado inteligente (*blurred backdrop*) para que las fotos nunca se deformen.
6. **Carga masiva:** El usuario puede seleccionar o arrastrar todas las fotos juntas de una sola vez.
7. **Control y reordenamiento del orden:** Antes de generar el video, la app muestra una galería interactiva con el orden numérico (#1, #2, #3...). El usuario puede reordenar las imágenes mediante **arrastrar y soltar (Drag & Drop)** o con los botones **◀ / ▶**.
8. **Edición flexible:** Es posible **eliminar** cualquier foto individualmente y **sumar nuevas fotos** en cualquier momento hasta completar el cupo de 6.
9. **Confirmación y renderizado:** Al pulsar el botón de confirmación, se genera el video con una barra de progreso en tiempo real (0% a 100%).
10. **Descarga automática:** Al finalizar el procesamiento, el video se descarga automáticamente en el navegador con el nombre `video.mp4` (o `video`).

---

## 🚀 Cómo Usar la Aplicación

### Opción 1: Abrir directamente en el navegador (Sin instalación)
Haz doble clic sobre el archivo `index.html` o ábrelo con cualquier navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox, Opera, Brave, Safari).

### Opción 2: Ejecutar con servidor local
Si tienes Node.js instalado:

```bash
# Iniciar un servidor estático local
npm start
```

Luego abre tu navegador en `http://localhost:3000` (o el puerto indicado).

---

## 📁 Fotos de Prueba Incluidas

Dentro de la carpeta `fotos_ejemplo/` encontrarás 6 imágenes en formato PNG optimizadas (pesan entre 24 KB y 48 KB, cumpliendo estrictamente con ser menores a 100 KB) para que puedas probar la aplicación de inmediato:

- `foto1_rojo_coral.png` (31.8 KB)
- `foto2_azul_marino.png` (35.1 KB)
- `foto3_verde_esmeralda.png` (27.3 KB)
- `foto4_purpura_real.png` (48.1 KB)
- `foto5_naranja_atardecer.png` (23.4 KB)
- `foto6_turquesa.png` (24.6 KB)

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 & CSS3 Moderno:** Diseño responsivo con estética glassmorphism, modo oscuro y animaciones sutiles.
- **Canvas API:** Renderizado de alta definición en relación 3:2 (720x480 px) a 30 FPS con filtros de desenfoque e interpolación easing.
- **MediaRecorder API:** Codificación de video MP4 / AVC1 con asignación adaptativa de bitrate calculada en base a la duración para respetar el límite de 1.000 KB.
- **Vanilla JavaScript:** 100% libre de dependencias pesadas, ejecutable directamente en el cliente.
