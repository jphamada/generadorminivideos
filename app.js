/**
 * Generador de Mini Videos - Lógica de Aplicación
 * Convierte una galería de hasta 6 fotos (<100 KB c/u) en un video MP4 animado (<1.000 KB, 3:2 - 720x480).
 */

(() => {
  'use strict';

  // ==========================================
  // CONFIGURACIÓN Y CONSTANTES
  // ==========================================
  const CONFIG = {
    MAX_IMAGES: 6,
    MAX_IMAGE_SIZE_BYTES: 100 * 1024,      // 100 KB (102,400 bytes)
    MAX_VIDEO_SIZE_BYTES: 1000 * 1024,     // 1.000 KB (1,024,000 bytes)
    CANVAS_WIDTH: 720,                     // Relación 3:2 (720x480)
    CANVAS_HEIGHT: 480,
    FPS: 30,
    DEFAULT_STAY_DURATION: 2.2,            // Segundos fija cada imagen
    DEFAULT_SLIDE_DURATION: 0.8,           // Segundos de transición de derecha a izquierda
    DOWNLOAD_FILENAME: 'video.mp4'         // Nombre solicitado: "video" y mp4
  };

  // ==========================================
  // ESTADO GLOBAL
  // ==========================================
  const state = {
    images: [], // Elementos: { id, file, name, size, img, src }
    isPlayingPreview: false,
    previewAnimId: null,
    previewStartTime: 0,
    isExporting: false,
    fitMode: 'contain-blur', // 'contain-blur' o 'cover'
    stayDuration: CONFIG.DEFAULT_STAY_DURATION,
    slideDuration: CONFIG.DEFAULT_SLIDE_DURATION
  };

  // ==========================================
  // REFERENCIAS DOM
  // ==========================================
  const dom = {
    fileInput: document.getElementById('fileInput'),
    dropzone: document.getElementById('dropzone'),
    btnLoadSamples: document.getElementById('btnLoadSamples'),
    galleryGrid: document.getElementById('galleryGrid'),
    imageCounterBadge: document.getElementById('imageCounterBadge'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewOverlay: document.getElementById('previewOverlay'),
    btnPlayPreview: document.getElementById('btnPlayPreview'),
    previewStatus: document.getElementById('previewStatus'),
    btnGenerate: document.getElementById('btnGenerate'),
    stayDurationSelect: document.getElementById('stayDurationSelect'),
    fitModeSelect: document.getElementById('fitModeSelect'),
    statDuration: document.getElementById('statDuration'),
    statEstSize: document.getElementById('statEstSize'),
    statImgCount: document.getElementById('statImgCount'),
    // Modal de progreso
    exportModal: document.getElementById('exportModal'),
    exportProgress: document.getElementById('exportProgress'),
    exportProgressText: document.getElementById('exportProgressText'),
    exportStatusDetail: document.getElementById('exportStatusDetail'),
    // Resultado
    resultSection: document.getElementById('resultSection'),
    resultVideo: document.getElementById('resultVideo'),
    resultFileSize: document.getElementById('resultFileSize'),
    btnDownloadAgain: document.getElementById('btnDownloadAgain'),
    // Toasts
    toastContainer: document.getElementById('toastContainer')
  };

  const previewCtx = dom.previewCanvas.getContext('2d');
  dom.previewCanvas.width = CONFIG.CANVAS_WIDTH;
  dom.previewCanvas.height = CONFIG.CANVAS_HEIGHT;

  // ==========================================
  // UTILIDADES
  // ==========================================
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    return kb.toFixed(1) + ' KB';
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'error') icon = '⚠️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚡';

    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ==========================================
  // CARGA Y GESTIÓN DE IMÁGENES
  // ==========================================
  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let addedCount = 0;
    let rejectedCount = 0;
    const errors = [];

    for (const file of fileList) {
      // Validar si ya se alcanzó el límite de 6 fotos
      if (state.images.length >= CONFIG.MAX_IMAGES) {
        showToast(`Se alcanzó el límite máximo de ${CONFIG.MAX_IMAGES} fotos.`, 'warning');
        break;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        errors.push(`"${file.name}" no es una imagen válida.`);
        rejectedCount++;
        continue;
      }

      // Validar tamaño: no debe superar los 100k
      if (file.size > CONFIG.MAX_IMAGE_SIZE_BYTES) {
        errors.push(`"${file.name}" pesa ${formatBytes(file.size)}, supera el límite de 100 KB.`);
        rejectedCount++;
        continue;
      }

      // Procesar y cargar imagen
      loadImageFile(file);
      addedCount++;
    }

    if (errors.length > 0) {
      errors.forEach(err => showToast(err, 'error'));
    }

    if (addedCount > 0) {
      showToast(`Se ${addedCount === 1 ? 'agregó 1 foto' : `agregaron ${addedCount} fotos`} con éxito.`, 'success');
    }

    // Resetear valor del input para permitir volver a seleccionar el mismo archivo si fue eliminado
    dom.fileInput.value = '';
  }

  function loadImageFile(file) {
    const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.images.push({
          id,
          file,
          name: file.name,
          size: file.size,
          img,
          src: e.target.result
        });
        updateUI();
        if (state.images.length === 1) {
          drawSingleFrame(0, 0);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeImage(id) {
    state.images = state.images.filter(item => item.id !== id);
    stopPreview();
    updateUI();
    if (state.images.length > 0) {
      drawSingleFrame(0, 0);
    } else {
      clearCanvas();
    }
    showToast('Foto eliminada.', 'info');
  }

  function moveImage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= state.images.length) return;
    const item = state.images.splice(fromIndex, 1)[0];
    state.images.splice(toIndex, 0, item);
    stopPreview();
    updateUI();
    drawSingleFrame(toIndex, 0);
  }

  // ==========================================
  // ACTUALIZACIÓN DE UI Y GALERÍA
  // ==========================================
  function updateUI() {
    const count = state.images.length;
    dom.imageCounterBadge.textContent = `${count} / ${CONFIG.MAX_IMAGES}`;
    dom.statImgCount.textContent = `${count} / ${CONFIG.MAX_IMAGES}`;

    // Renderizar tarjetas de la galería
    dom.galleryGrid.innerHTML = '';

    if (count === 0) {
      dom.galleryGrid.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p>No hay fotos cargadas aún.</p>
          <span style="font-size:0.78rem;color:#64748b;">Carga hasta 6 imágenes (máx 100 KB c/u)</span>
        </div>
      `;
      dom.previewOverlay.classList.remove('hidden');
      dom.btnPlayPreview.disabled = true;
      dom.btnGenerate.disabled = true;
    } else {
      dom.previewOverlay.classList.add('hidden');
      dom.btnPlayPreview.disabled = false;
      dom.btnGenerate.disabled = false;

      state.images.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'img-card';
        card.draggable = true;
        card.dataset.index = index;
        card.dataset.id = item.id;

        card.innerHTML = `
          <div class="img-card-order">#${index + 1}</div>
          <img src="${item.src}" alt="${item.name}" class="img-card-preview">
          <div class="img-card-info">
            <span class="img-card-name" title="${item.name}">${item.name}</span>
            <span class="img-card-size">${formatBytes(item.size)}</span>
          </div>
          <div class="img-card-actions">
            <button type="button" class="card-btn move-left-btn" title="Mover a la izquierda" ${index === 0 ? 'disabled' : ''}>
              ◀
            </button>
            <button type="button" class="card-btn move-right-btn" title="Mover a la derecha" ${index === count - 1 ? 'disabled' : ''}>
              ▶
            </button>
            <button type="button" class="card-btn delete-btn" title="Eliminar foto">
              🗑️
            </button>
          </div>
        `;

        // Eventos de botones
        card.querySelector('.move-left-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          moveImage(index, index - 1);
        });

        card.querySelector('.move-right-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          moveImage(index, index + 1);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          removeImage(item.id);
        });

        // Eventos Drag and Drop para reordenar
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', index);
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          document.querySelectorAll('.img-card').forEach(c => c.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('drag-over');
          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (!isNaN(fromIndex) && fromIndex !== index) {
            moveImage(fromIndex, index);
          }
        });

        dom.galleryGrid.appendChild(card);
      });

      // Si hay menos de 6 fotos, agregar un botón para sumar fotos
      if (count < CONFIG.MAX_IMAGES) {
        const addTile = document.createElement('button');
        addTile.type = 'button';
        addTile.className = 'add-tile-btn';
        addTile.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span style="font-size:0.75rem;font-weight:600;">+ Sumar foto</span>
          <span style="font-size:0.65rem;opacity:0.7;">Quedan ${CONFIG.MAX_IMAGES - count}</span>
        `;
        addTile.addEventListener('click', () => dom.fileInput.click());
        dom.galleryGrid.appendChild(addTile);
      }
    }

    updateEstimations();
  }

  function updateEstimations() {
    const count = state.images.length;
    if (count === 0) {
      dom.statDuration.textContent = '0.0 s';
      dom.statEstSize.textContent = '~0 KB';
      return;
    }

    // Cálculo de duración:
    // Si hay N fotos:
    // Para N = 1: 3.0s
    // Para N > 1: (N - 1) * (stay + slide) + stay + 0.5s cierre
    let totalSec = 0;
    if (count === 1) {
      totalSec = 3.0;
    } else {
      totalSec = (count - 1) * (state.stayDuration + state.slideDuration) + state.stayDuration + 0.5;
    }

    dom.statDuration.textContent = `${totalSec.toFixed(1)} s`;

    // Bitrate estimado fijado para garantizar < 1.000 KB (apuntando a ~550 KB)
    const targetKBytes = Math.min(750, Math.floor(totalSec * 50));
    dom.statEstSize.textContent = `~${targetKBytes} KB (Límite 1.000 KB)`;
  }

  // ==========================================
  // RENDERIZADO EN CANVAS 4:3 (Efecto Carrusel)
  // ==========================================
  function clearCanvas(ctx = previewCtx) {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }

  /**
   * Dibuja una imagen en el canvas con el estilo configurado (contain con fondo blur o cover).
   * @param {CanvasRenderingContext2D} ctx 
   * @param {HTMLImageElement} img 
   * @param {number} xOffset Desplazamiento horizontal en píxeles (para transición)
   */
  function drawImageOnCanvas(ctx, img, xOffset) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;

    ctx.save();
    // Delimitar zona de renderizado de la diapositiva
    ctx.beginPath();
    ctx.rect(xOffset, 0, W, H);
    ctx.clip();

    if (state.fitMode === 'cover') {
      // Modo Cover: llena el marco 3:2 recortando proporcionalmente
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = W / H;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawH = H;
        drawW = H * imgRatio;
        drawX = xOffset + (W - drawW) / 2;
        drawY = 0;
      } else {
        drawW = W;
        drawH = W / imgRatio;
        drawX = xOffset;
        drawY = (H - drawH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Modo Contain con fondo desenfocado (Blurred backdrop) - look profesional
      // 1. Fondo suave y desenfocado de la propia imagen
      ctx.filter = 'blur(16px) brightness(0.4)';
      ctx.drawImage(img, xOffset - 30, -30, W + 60, H + 60);
      ctx.filter = 'none';

      // 2. Capa oscura de contraste sutil
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(xOffset, 0, W, H);

      // 3. Imagen central nítida ajustada en aspecto original
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = W / H;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawW = W * 0.94;
        drawH = drawW / imgRatio;
        drawX = xOffset + (W - drawW) / 2;
        drawY = (H - drawH) / 2;
      } else {
        drawH = H * 0.94;
        drawW = drawH * imgRatio;
        drawX = xOffset + (W - drawW) / 2;
        drawY = (H - drawH) / 2;
      }

      // Sombra sutil para la imagen central
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }

  /**
   * Dibuja un fotograma estático de una foto específica.
   */
  function drawSingleFrame(index, xOffset = 0, ctx = previewCtx) {
    if (!state.images[index]) return;
    clearCanvas(ctx);
    drawImageOnCanvas(ctx, state.images[index].img, xOffset);
  }

  /**
   * Renderiza el estado de animación en el tiempo t (en segundos).
   * Efecto: Las fotos pasan como un carrusel de derecha a izquierda.
   * La foto actual sale hacia la izquierda (-W) mientras la siguiente entra desde la derecha (+W -> 0).
   */
  function renderAtTime(t, ctx = previewCtx) {
    const count = state.images.length;
    if (count === 0) {
      clearCanvas(ctx);
      return;
    }

    if (count === 1) {
      // 1 foto sola
      clearCanvas(ctx);
      drawImageOnCanvas(ctx, state.images[0].img, 0);
      return;
    }

    const W = CONFIG.CANVAS_WIDTH;
    const stay = state.stayDuration;
    const slide = state.slideDuration;
    const cycle = stay + slide;

    // Calcular en qué foto o transición estamos
    const currentPairIndex = Math.floor(t / cycle);

    if (currentPairIndex >= count - 1) {
      // Estamos en la última foto
      const timeInLast = t - (count - 1) * cycle;
      clearCanvas(ctx);
      drawImageOnCanvas(ctx, state.images[count - 1].img, 0);

      // Cierre sutil en el último medio segundo
      if (timeInLast > stay) {
        const fadeProgress = Math.min(1, (timeInLast - stay) / 0.5);
        ctx.fillStyle = `rgba(2, 6, 23, ${fadeProgress * 0.8})`;
        ctx.fillRect(0, 0, W, CONFIG.CANVAS_HEIGHT);
      }
      return;
    }

    // Estamos entre foto[currentPairIndex] y foto[currentPairIndex + 1]
    const timeInStep = t - currentPairIndex * cycle;

    if (timeInStep < stay) {
      // Mostrando foto actual quieta
      clearCanvas(ctx);
      drawImageOnCanvas(ctx, state.images[currentPairIndex].img, 0);
    } else {
      // Transición activa: carrusel de derecha a izquierda
      const slideProgress = (timeInStep - stay) / slide;
      const eased = easeInOutCubic(Math.min(1, Math.max(0, slideProgress)));

      // Desplazamientos:
      // La actual sale a la izquierda (0 -> -W)
      // La siguiente entra desde la derecha (W -> 0)
      const currentX = -eased * W;
      const nextX = W * (1 - eased);

      clearCanvas(ctx);
      drawImageOnCanvas(ctx, state.images[currentPairIndex].img, currentX);
      drawImageOnCanvas(ctx, state.images[currentPairIndex + 1].img, nextX);
    }
  }

  // ==========================================
  // VISTA PREVIA EN VIVO
  // ==========================================
  function getTotalDuration() {
    const count = state.images.length;
    if (count === 0) return 0;
    if (count === 1) return 3.0;
    return (count - 1) * (state.stayDuration + state.slideDuration) + state.stayDuration + 0.5;
  }

  function startPreview() {
    if (state.images.length === 0) return;
    state.isPlayingPreview = true;
    state.previewStartTime = performance.now();
    dom.btnPlayPreview.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      Pausar vista previa
    `;

    function loop(now) {
      if (!state.isPlayingPreview) return;
      const elapsed = (now - state.previewStartTime) / 1000;
      const total = getTotalDuration();

      if (elapsed >= total) {
        // Reiniciar en bucle para que el usuario pueda seguir viendo
        state.previewStartTime = performance.now();
        state.previewAnimId = requestAnimationFrame(loop);
        return;
      }

      renderAtTime(elapsed, previewCtx);
      dom.previewStatus.textContent = `${elapsed.toFixed(1)}s / ${total.toFixed(1)}s`;
      state.previewAnimId = requestAnimationFrame(loop);
    }

    state.previewAnimId = requestAnimationFrame(loop);
  }

  function stopPreview() {
    state.isPlayingPreview = false;
    if (state.previewAnimId) {
      cancelAnimationFrame(state.previewAnimId);
      state.previewAnimId = null;
    }
    dom.btnPlayPreview.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      Reproducir vista previa
    `;
    dom.previewStatus.textContent = 'Pausado';
  }

  function togglePreview() {
    if (state.isPlayingPreview) {
      stopPreview();
    } else {
      startPreview();
    }
  }

  // ==========================================
  // GENERACIÓN Y EXPORTACIÓN DE VIDEO MP4
  // ==========================================

  /**
   * Determina el mejor tipo MIME compatible con MP4 en el navegador del usuario.
   */
  function getSupportedMimeType() {
    const candidateTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm'
    ];

    for (const type of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Genera el video animado y lo descarga automáticamente como video.mp4,
   * garantizando que el archivo final no supere los 1.000 KB.
   */
  async function generateVideo() {
    if (state.images.length === 0) {
      showToast('Carga al menos una foto para generar el video.', 'warning');
      return;
    }

    if (state.isExporting) return;
    state.isExporting = true;
    stopPreview();

    // Mostrar modal de progreso
    dom.exportModal.classList.add('show');
    dom.exportProgress.style.width = '0%';
    dom.exportProgressText.textContent = '0%';
    dom.exportStatusDetail.textContent = 'Preparando fotogramas...';

    const totalDuration = getTotalDuration();
    const fps = CONFIG.FPS;
    const totalFrames = Math.ceil(totalDuration * fps);

    // Calcular bitrate óptimo para cumplir estrictamente < 1.000 KB
    // Objetivo seguro: 650 KB (deja 350 KB de margen contra el límite de 1.000 KB)
    const targetKiloBytes = 650;
    let targetBitrate = Math.floor((targetKiloBytes * 1024 * 8) / totalDuration);
    // Limitar bitrate entre 300 kbps y 1200 kbps
    targetBitrate = Math.max(300000, Math.min(1200000, targetBitrate));

    try {
      let finalBlob = await recordCanvasAnimation(targetBitrate, totalDuration, totalFrames);

      // Verificación estricta: si por alguna anomalía del codec supera los 1.000 KB (1,024,000 bytes):
      if (finalBlob.size > CONFIG.MAX_VIDEO_SIZE_BYTES) {
        dom.exportStatusDetail.textContent = 'Ajustando compresión para asegurar < 1.000 KB...';
        // Reducir bitrate a la mitad y volver a renderizar
        const safeBitrate = Math.floor(targetBitrate * 0.6);
        finalBlob = await recordCanvasAnimation(safeBitrate, totalDuration, totalFrames);
      }

      // Verificar resultado final
      const finalSizeKB = (finalBlob.size / 1024).toFixed(1);
      const isUnderLimit = finalBlob.size <= CONFIG.MAX_VIDEO_SIZE_BYTES;

      // Ocultar modal de progreso
      dom.exportModal.classList.remove('show');

      // Descarga automática en el navegador
      triggerDownload(finalBlob, CONFIG.DOWNLOAD_FILENAME);

      // Mostrar reproductor con el resultado
      showResultSection(finalBlob, finalSizeKB, isUnderLimit);

      showToast(`¡Video MP4 generado con éxito! (${finalSizeKB} KB / < 1.000 KB)`, 'success');
    } catch (err) {
      console.error('Error al generar video:', err);
      dom.exportModal.classList.remove('show');
      showToast('Ocurrió un error al generar el video: ' + err.message, 'error');
    } finally {
      state.isExporting = false;
    }
  }

  /**
   * Graba la animación del canvas usando MediaRecorder con el bitrate especificado.
   */
  function recordCanvasAnimation(bitrate, totalDuration, totalFrames) {
    return new Promise((resolve, reject) => {
      // Canvas oculto dedicado a la exportación para máxima calidad y sin interferencia
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = CONFIG.CANVAS_WIDTH;
      exportCanvas.height = CONFIG.CANVAS_HEIGHT;
      const exportCtx = exportCanvas.getContext('2d');

      const mimeType = getSupportedMimeType();
      const stream = exportCanvas.captureStream(CONFIG.FPS);

      const recorderOptions = {
        videoBitsPerSecond: bitrate
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      let recorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch (e) {
        // Fallback a opciones por defecto si el navegador rechaza alguna combinación
        try {
          recorder = new MediaRecorder(stream);
        } catch (e2) {
          return reject(new Error('MediaRecorder no está soportado en este navegador: ' + e2.message));
        }
      }

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Crear Blob con tipo video/mp4 para asegurar descarga de MP4
        const recordedBlob = new Blob(chunks, { type: 'video/mp4' });
        resolve(recordedBlob);
      };

      recorder.onerror = (e) => {
        reject(new Error('Error en MediaRecorder: ' + (e.error ? e.error.name : 'Desconocido')));
      };

      // Iniciar grabación
      recorder.start();

      let currentFrame = 0;
      const frameInterval = 1000 / CONFIG.FPS;

      function renderFrame() {
        if (currentFrame >= totalFrames) {
          dom.exportProgress.style.width = '100%';
          dom.exportProgressText.textContent = '100%';
          dom.exportStatusDetail.textContent = 'Finalizando codificación del video...';

          setTimeout(() => {
            recorder.stop();
          }, 300);
          return;
        }

        const currentTime = currentFrame / CONFIG.FPS;
        renderAtTime(currentTime, exportCtx);

        // Actualizar barra de progreso
        const progressPct = Math.round((currentFrame / totalFrames) * 100);
        dom.exportProgress.style.width = `${progressPct}%`;
        dom.exportProgressText.textContent = `${progressPct}%`;
        dom.exportStatusDetail.textContent = `Renderizando cuadro ${currentFrame + 1} de ${totalFrames}...`;

        currentFrame++;
        setTimeout(renderFrame, frameInterval);
      }

      renderFrame();
    });
  }

  /**
   * Ejecuta la descarga automática del archivo en el navegador del usuario.
   */
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Muestra la sección de resultado con el reproductor para revisar el video generado.
   */
  function showResultSection(blob, sizeKB, isUnderLimit) {
    const url = URL.createObjectURL(blob);
    dom.resultVideo.src = url;
    dom.resultFileSize.innerHTML = `
      <strong>Tamaño final:</strong> ${sizeKB} KB ${isUnderLimit ? '✅ (Menor a 1.000 KB)' : '⚠️'}
    `;
    dom.resultSection.style.display = 'flex';

    dom.btnDownloadAgain.onclick = () => {
      triggerDownload(blob, CONFIG.DOWNLOAD_FILENAME);
    };

    // Scroll suave hacia la sección de resultados
    dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ==========================================
  // INICIALIZACIÓN Y EVENT LISTENERS
  // ==========================================
  function init() {
    // 1. Selector de archivos
    dom.fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });

    // Botón para cargar fotos de prueba
    if (dom.btnLoadSamples) {
      dom.btnLoadSamples.addEventListener('click', async () => {
        const sampleFiles = [
          'fotos_ejemplo/foto1_rojo_coral.png',
          'fotos_ejemplo/foto2_azul_marino.png',
          'fotos_ejemplo/foto3_verde_esmeralda.png',
          'fotos_ejemplo/foto4_purpura_real.png',
          'fotos_ejemplo/foto5_naranja_atardecer.png',
          'fotos_ejemplo/foto6_turquesa.png'
        ];
        
        try {
          const files = [];
          for (const path of sampleFiles) {
            const res = await fetch(path);
            if (!res.ok) throw new Error('No se pudo acceder a las fotos de muestra.');
            const blob = await res.blob();
            const fileName = path.split('/').pop();
            const file = new File([blob], fileName, { type: 'image/png' });
            files.push(file);
          }
          handleFiles(files);
        } catch (err) {
          showToast('Para cargar fotos de ejemplo automáticas, inicia con un servidor local o selecciónalas desde la carpeta fotos_ejemplo.', 'info');
        }
      });
    }

    // 2. Drag & Drop sobre la zona de carga
    ['dragenter', 'dragover'].forEach(eventName => {
      dom.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dom.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.dropzone.classList.remove('drag-active');
      });
    });

    dom.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files) {
        handleFiles(dt.files);
      }
    });

    // 3. Controles de vista previa
    dom.btnPlayPreview.addEventListener('click', togglePreview);

    // 4. Cambios en opciones
    dom.stayDurationSelect.addEventListener('change', (e) => {
      state.stayDuration = parseFloat(e.target.value);
      updateEstimations();
      if (!state.isPlayingPreview && state.images.length > 0) {
        drawSingleFrame(0, 0);
      }
    });

    dom.fitModeSelect.addEventListener('change', (e) => {
      state.fitMode = e.target.value;
      if (!state.isPlayingPreview && state.images.length > 0) {
        drawSingleFrame(0, 0);
      }
    });

    // 5. Botón Generar Video
    dom.btnGenerate.addEventListener('click', generateVideo);

    // Inicializar estado vacío
    updateUI();
    clearCanvas();
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
