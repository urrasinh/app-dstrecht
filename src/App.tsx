import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useExif } from './hooks/useExif';
import { useGestures } from './hooks/useGestures';
import { useUploadSync } from './hooks/useUploadSync';
import { useAuth } from './contexts/AuthContext';
import { logout, listenForegroundPush } from './firebase';
import { whoami } from './utils/adminApi';
import { MODES, VISUAL_FILTERS, buildFilterDefaults } from './utils/dstretch';
import type { WorkerRequest, WorkerResponse } from './types';

import { InfoModal } from './components/InfoModal';
import { ResolutionModal } from './components/ResolutionModal';
import { ControlsPanel } from './components/ControlsPanel';
import { FloatingTools } from './components/FloatingTools';
import { FreeCrop } from './components/FreeCrop';
import { Spinner } from './components/Spinner';
import { AuthGate } from './components/AuthGate';
import { InstallPrompt } from './components/InstallPrompt';
import { Feed } from './components/Feed';
import { UsersList } from './components/UsersList';
import { PushPermissionBanner } from './components/PushPermissionBanner';
import { Tutorial, type TutorialStep } from './components/Tutorial';
import { loadDemoImage } from './utils/demoImage';
import { DonateModal } from './components/DonateModal';
import { FirstTimeWelcome } from './components/FirstTimeWelcome';

import './index.css';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const uploadSync = useUploadSync();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'feed' | 'users'>('editor');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(() => !!localStorage.getItem('has-downloaded'));
  const [donateBubbleVisible, setDonateBubbleVisible] = useState(false);
  const donateHideTimerRef = useRef<number | null>(null);
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const stuckTimerRef = useRef<number | null>(null);

  // State: Images
  const [baseImage, setBaseImage] = useState<ImageData | null>(null);
  const [cachedModes, setCachedModes] = useState<Record<string, ImageData>>({});
  const [pendingRotatedImg, setPendingRotatedImg] = useState<HTMLImageElement | null>(null);
  const [previews, setPreviews] = useState<{ mode: string; dataUrl: string; desc: string }[]>([]);


  // State: UI
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCropGrid, setShowCropGrid] = useState(false);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);

  // State: Modals
  const [showResModal, setShowResModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  // State: Filters
  const [currentMode, setCurrentMode] = useState('YDS');
  const [currentFilter, setCurrentFilter] = useState('Normal');
  const [filterParams, setFilterParams] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    for (const id of Object.keys(VISUAL_FILTERS)) init[id] = buildFilterDefaults(id);
    return init;
  });

  // State: Cropping
  const [isCropping, setIsCropping] = useState(false);

  // Hooks
  const { exifData, extractExif, setOriginalDimensions } = useExif();
  const {
    scale, originX, originY, resetCamera,
    events: gestureEvents,
    handleMouseMove, handleMouseUp, handleWheel
  } = useGestures(
    () => setShowCropGrid(true),
    () => setTimeout(() => setShowCropGrid(false), 500)
  );

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/image.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      if (res.type === 'PROGRESS') {
        setLoadingProgress(res.progress);
        setLoadingText(res.message);
      } else if (res.type === 'SUCCESS' || res.type === 'ERROR') {
        // Worker responded — cancel safety timer
        if (stuckTimerRef.current) {
          clearTimeout(stuckTimerRef.current);
          stuckTimerRef.current = null;
        }
      }
      if (res.type === 'SUCCESS') {
        const newCachedModes: Record<string, ImageData> = {};
        res.processedImages.forEach(img => {
          newCachedModes[img.modeName] = img.imageData;
        });

        // Merge with existing modes so we don't lose YDS/YBR if we only returned ADVANCED
        setCachedModes(prev => {
          const merged = { ...prev, ...newCachedModes };
          return merged;
        });

        // Only update base image if it's an INIT_PROCESS (when multiple modes come back).
        // Since ADVANCED mode only returns 1 processed image, we can use that hint:
        if (res.processedImages.length > 1) {
          setBaseImage(res.baseImageData);
          generatePreviews(res.baseImageData);
          if (viewportRef.current) {
            resetCamera(res.baseImageData.width, res.baseImageData.height, viewportRef.current.clientWidth, viewportRef.current.clientHeight);
          }
        }

        if (res.processedImages.length === 1 && res.processedImages[0].modeName === 'ADVANCED') {
          setCurrentMode('ADVANCED');
        }

        setIsProcessing(false);
        setLoadingProgress(100);
        showToast("Imagen procesada correctamente");
      } else if (res.type === 'ERROR') {
        console.error("Worker Error:", res.error);
        setIsProcessing(false);
        showToast("Error procesando imagen");
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [resetCamera]);

  // Window Listeners for gestures
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (viewport) {
        viewport.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleMouseMove, handleMouseUp, handleWheel]);

  // Auto-fit image whenever the viewport size changes (panel toggle, rotation, etc.)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !baseImage) return;
    const ro = new ResizeObserver(() => {
      if (viewport.clientWidth > 0 && viewport.clientHeight > 0) {
        resetCamera(baseImage.width, baseImage.height, viewport.clientWidth, viewport.clientHeight);
      }
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [baseImage, resetCamera]);


  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // First-login welcome → tutorial trigger
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem('tutorial-completed-v1')) return;
    const welcomeDone = localStorage.getItem('welcome-completed-v1');
    const t = setTimeout(() => {
      if (welcomeDone) setShowTutorial(true);
      else setShowWelcome(true);
    }, 600);
    return () => clearTimeout(t);
  }, [user]);

  // Pop the donate bubble for 30s
  const flashDonateBubble = useCallback(() => {
    setDonateBubbleVisible(true);
    if (donateHideTimerRef.current) clearTimeout(donateHideTimerRef.current);
    donateHideTimerRef.current = window.setTimeout(() => {
      setDonateBubbleVisible(false);
      donateHideTimerRef.current = null;
    }, 30000);
  }, []);

  // Show donate bubble for 30s when first image loads (defer if tutorial/welcome covers screen)
  useEffect(() => {
    if (!baseImage) return;
    if (showWelcome || showTutorial) return;
    flashDonateBubble();
  }, [baseImage, showWelcome, showTutorial, flashDonateBubble]);

  // Detect admin role; push token registration is opt-in via PushPermissionBanner
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await whoami();
        if (cancelled) return;
        setIsAdmin(r.isAdmin);
      } catch {
        // Backend may be unreachable, on an old version, or network is offline.
        // Default to non-admin silently — admin features stay hidden.
        if (!cancelled) setIsAdmin(false);
      }
    })();
    listenForegroundPush((title, body) => {
      showToast(`${title}: ${body}`);
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    // Allow re-selecting the same file by resetting the input value immediately
    inputEl.value = '';
    if (!file) return;

    // Safety net: if anything hangs, force-clear processing state after 60s
    let safetyTimer: number | undefined = window.setTimeout(() => {
      setIsProcessing(false);
      showToast("La subida tardó demasiado. Intenta de nuevo.");
    }, 60000);
    const clearSafety = () => { if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = undefined; } };

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("ANALIZANDO IMAGEN...");

    try {
      // 1. Intentar extraer metadatos de forma asíncrona pero sin bloquear la carga si falla
      let orientation = 1;
      let exifSnapshot = { make: '', model: '', date: '', latDD: null as number | null, lonDD: null as number | null };
      try {
        const r = await extractExif(file);
        orientation = r.orientation;
        exifSnapshot = { make: r.data.make, model: r.data.model, date: r.data.date, latDD: r.data.latDD, lonDD: r.data.lonDD };
      } catch (exifErr) {
        console.warn("Exif extraction failed, using default orientation 1", exifErr);
      }

      // Encolar la imagen ORIGINAL para subir a Drive/Sheets
      if (user) {
        try {
          await uploadSync.queue({
            userEmail: user.email || 'unknown',
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            fileBlob: file,
            lat: exifSnapshot.latDD,
            lon: exifSnapshot.lonDD,
            camera: `${exifSnapshot.make} ${exifSnapshot.model}`.trim(),
            captureDate: exifSnapshot.date,
          });
        } catch (qErr) {
          console.warn('No se pudo encolar la subida', qErr);
        }
      }

      setLoadingText("DECODIFICANDO IMAGEN...");

      // 2. Método Híbrido Robusto: Usar FileReader + Image Nativa para mejor compatibilidad cruzada
      const reader = new FileReader();

      reader.onerror = () => {
        clearSafety();
        setIsProcessing(false);
        showToast("No se pudo leer el archivo. Intenta otra vez.");
      };

      reader.onload = (event) => {
        if (!event.target?.result) {
          clearSafety();
          setIsProcessing(false);
          showToast("Error leyendo archivo");
          return;
        }

        const img = new Image();
        img.onerror = () => {
          clearSafety();
          setIsProcessing(false);
          showToast("Formato de imagen inválido o no soportado nativamente por tu navegador.");
        };

        img.onload = () => {
          try {
            const oCanvas = document.createElement('canvas');
            const oCtx = oCanvas.getContext('2d')!;
            let iw = img.width, ih = img.height;

            if ([5, 6, 7, 8].includes(orientation)) { oCanvas.width = ih; oCanvas.height = iw; }
            else { oCanvas.width = iw; oCanvas.height = ih; }

            oCtx.save();
            switch (orientation) {
              case 2: oCtx.translate(iw, 0); oCtx.scale(-1, 1); break;
              case 3: oCtx.translate(iw, ih); oCtx.rotate(Math.PI); break;
              case 4: oCtx.translate(0, ih); oCtx.scale(1, -1); break;
              case 5: oCtx.rotate(0.5 * Math.PI); oCtx.scale(1, -1); break;
              case 6: oCtx.rotate(0.5 * Math.PI); oCtx.translate(0, -ih); break;
              case 7: oCtx.rotate(0.5 * Math.PI); oCtx.translate(iw, -ih); oCtx.scale(-1, 1); break;
              case 8: oCtx.rotate(-0.5 * Math.PI); oCtx.translate(-iw, 0); break;
            }
            // Use smoothing for high quality downscaling before data processing
            oCtx.imageSmoothingEnabled = true;
            oCtx.imageSmoothingQuality = 'high';
            oCtx.drawImage(img, 0, 0, iw, ih);
            oCtx.restore();

            const rotatedImg = new Image();
            rotatedImg.onload = () => {
              clearSafety();
              setPendingRotatedImg(rotatedImg);
              setOriginalDimensions(rotatedImg.width, rotatedImg.height);
              setIsProcessing(false);
              setShowResModal(true);
            };
            rotatedImg.onerror = () => {
              clearSafety();
              setIsProcessing(false);
              showToast("Error generando vista previa de la imagen.");
            };

            // Generate highest quality JPEG to pass to canvas to strip away exotic properties
            // from some WEBP/HEIC/RAWs that Safari/Chrome might struggle with in Canvas get/putImageData
            rotatedImg.src = oCanvas.toDataURL('image/jpeg', 1.0);

          } catch (canvasErr) {
            console.error("Canvas manipulation failed", canvasErr);
            clearSafety();
            setIsProcessing(false);
            showToast("Error procesando imagen para web.");
          }
        };
        img.src = event.target.result as string;
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error("Upload handler total failure", error);
      clearSafety();
      setIsProcessing(false);
      showToast("Error de subida inesperado.");
    }
  };

  const loadTutorialDemo = async () => {
    const demo = await loadDemoImage();
    setOriginalDimensions(demo.width, demo.height);
    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText('CARGANDO DEMO...');
    startInitialProcessing(demo, false);
  };

  const startInitialProcessing = (img: HTMLImageElement, scaleDown: boolean) => {
    setShowResModal(false);
    resetAllFiltersUI();
    setIsProcessing(true);
    setLoadingProgress(0);

    try {
      // Convert Image to ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tCtx = tempCanvas.getContext('2d')!;
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = 'high';
      tCtx.drawImage(img, 0, 0, img.width, img.height);
      const imageData = tCtx.getImageData(0, 0, img.width, img.height);

      if (!workerRef.current) {
        setIsProcessing(false);
        showToast("Worker no inicializado. Recarga la página.");
        return;
      }

      // Safety net: if worker doesn't respond in 180s, unstick the UI.
      // The main worker onmessage handler clears this timer on SUCCESS/ERROR (see useEffect).
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = window.setTimeout(() => {
        setIsProcessing(false);
        showToast("El procesamiento tardó demasiado. Intenta con 'Optimizar' (2048px).");
        stuckTimerRef.current = null;
      }, 180000);

      workerRef.current.postMessage({
        type: 'INIT_PROCESS',
        imageData,
        scaleDown
      } as WorkerRequest);
    } catch (err) {
      console.error("startInitialProcessing failed", err);
      setIsProcessing(false);
      showToast("Imagen demasiado grande o memoria insuficiente. Intenta con 'Optimizar'.");
    }
  };

  const generatePreviews = (baseImgData: ImageData) => {
    // Generate small previews synchronously to avoid complex worker roundtrips for 65px images
    const size = 65;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d')!;

    // Scale down central crop
    const minDim = Math.min(baseImgData.width, baseImgData.height);
    const sx = (baseImgData.width - minDim) / 2;
    const sy = (baseImgData.height - minDim) / 2;

    const tmpOriginal = document.createElement('canvas');
    tmpOriginal.width = baseImgData.width;
    tmpOriginal.height = baseImgData.height;
    tmpOriginal.getContext('2d')!.putImageData(baseImgData, 0, 0);

    ctx.drawImage(tmpOriginal, sx, sy, minDim, minDim, 0, 0, size, size);
    const previewBaseData = ctx.getImageData(0, 0, size, size);

    const modeKeys = Object.keys(MODES);
    const generated: { mode: string, dataUrl: string, desc: string }[] = [];

    for (let i = 0; i < modeKeys.length; i++) {
      const mode = modeKeys[i];
      let pData = previewBaseData;

      // Very basic sync mock of DStretch for 65px preview to keep UI snappy
      if (mode !== 'ORIGINAL' && mode !== 'ADVANCED') {
        // To prevent main thread freezing, we just use the original image in preview 
        // for now, but in reality we should apply the matrix synchronous for 65x65
        // The visual difference is small enough that pure DStretch is fast here.
        // We will re-use the worker or a fast sync mapped function:
      }

      tempCanvas.width = size;
      tempCanvas.height = size;
      ctx.putImageData(pData, 0, 0);
      generated.push({
        mode,
        dataUrl: tempCanvas.toDataURL('image/jpeg', 0.6),
        desc: MODES[mode]?.desc || ''
      });
    }

    setPreviews(generated);
  };

  // Generate real previews when cachedModes updates
  useEffect(() => {
    if (!baseImage || Object.keys(cachedModes).length === 0) return;

    const size = 65;
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = size; thumbCanvas.height = size;
    const tCtx = thumbCanvas.getContext('2d')!;

    const tempCanvas = document.createElement('canvas');

    const newPreviews = Object.keys(MODES).map(mode => {
      let srcImageData = cachedModes[mode] || baseImage;

      tempCanvas.width = srcImageData.width;
      tempCanvas.height = srcImageData.height;
      tempCanvas.getContext('2d')!.putImageData(srcImageData, 0, 0);

      const minDim = Math.min(srcImageData.width, srcImageData.height);
      const sx = (srcImageData.width - minDim) / 2;
      const sy = (srcImageData.height - minDim) / 2;

      tCtx.clearRect(0, 0, size, size);
      tCtx.drawImage(tempCanvas, sx, sy, minDim, minDim, 0, 0, size, size);

      return {
        mode,
        desc: MODES[mode].desc,
        dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.8)
      };
    });

    setPreviews(newPreviews);
  }, [cachedModes, baseImage]);



  // Build the current CSS filter string (used on the canvas DOM element for cross-browser support
  // — ctx.filter only works on Safari iOS 17.4+, but CSS filter on <canvas> works on iOS 9+)
  const cssFilterString = (() => {
    if (isShowingOriginal) return 'none';
    const def = VISUAL_FILTERS[currentFilter];
    if (!def) return 'none';
    const built = def.build(filterParams[currentFilter] || {});
    return built || 'none';
  })();

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage || !cachedModes[currentMode]) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentImageData = isShowingOriginal ? baseImage : cachedModes[currentMode];
    canvas.width = currentImageData.width;
    canvas.height = currentImageData.height;

    // Use an offscreen canvas to putImageData, then drawImage with CSS filters
    const off = document.createElement('canvas');
    off.width = currentImageData.width;
    off.height = currentImageData.height;
    off.getContext('2d')!.putImageData(currentImageData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Visual filter is applied via CSS on the canvas DOM element (cssFilterString).
    // We do NOT use ctx.filter here to avoid double-application on browsers that support it
    // and to ensure consistent rendering on iOS Safari < 17.4 (which doesn't support ctx.filter).
    ctx.drawImage(off, 0, 0);

  }, [baseImage, cachedModes, currentMode, isShowingOriginal, currentFilter, filterParams]);


  const resetAllFiltersUI = () => {
    setCurrentMode('ORIGINAL');
    setCurrentFilter('Normal');
    // Reset all visual filter params back to their defaults
    const fresh: Record<string, Record<string, number>> = {};
    for (const id of Object.keys(VISUAL_FILTERS)) fresh[id] = buildFilterDefaults(id);
    setFilterParams(fresh);
  };

  const handleReset = () => {
    resetAllFiltersUI();
    setCurrentMode('ORIGINAL');
    if (viewportRef.current && baseImage) {
      resetCamera(baseImage.width, baseImage.height, viewportRef.current.clientWidth, viewportRef.current.clientHeight);
    }
    showToast("Imagen restaurada a la original");
  };

  const handleBake = () => {
    if (!baseImage || !cachedModes[currentMode] || !canvasRef.current) return;

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("FIJANDO FILTROS...");

    // Get the current rendered canvas with filters applied
    const bakeCanvas = document.createElement('canvas');
    bakeCanvas.width = canvasRef.current.width;
    bakeCanvas.height = canvasRef.current.height;
    const bCtx = bakeCanvas.getContext('2d')!;

    // Draw the image without transform but WITH filters
    const def = VISUAL_FILTERS[currentFilter];
    bCtx.filter = def ? def.build(filterParams[currentFilter] || {}) : '';

    const off = document.createElement('canvas');
    off.width = cachedModes[currentMode].width;
    off.height = cachedModes[currentMode].height;
    off.getContext('2d')!.putImageData(cachedModes[currentMode], 0, 0);

    bCtx.drawImage(off, 0, 0);

    const bakedImageData = bCtx.getImageData(0, 0, bakeCanvas.width, bakeCanvas.height);

    showToast("Filtros fijados. Recalculando matrices focalizadas...");
    resetAllFiltersUI();

    workerRef.current?.postMessage({
      type: 'INIT_PROCESS',
      imageData: bakedImageData,
      scaleDown: false
    } as WorkerRequest);
  };

  const handleRotate = () => {
    if (!baseImage) return;
    setIsMenuOpen(false);

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("ROTANDO 90°...");

    // Rotate the base image
    const rCanvas = document.createElement('canvas');
    rCanvas.width = baseImage.height;
    rCanvas.height = baseImage.width;
    const rCtx = rCanvas.getContext('2d')!;

    const off = document.createElement('canvas');
    off.width = baseImage.width;
    off.height = baseImage.height;
    off.getContext('2d')!.putImageData(baseImage, 0, 0);

    rCtx.translate(rCanvas.width / 2, rCanvas.height / 2);
    rCtx.rotate(90 * Math.PI / 180);
    rCtx.drawImage(off, -baseImage.width / 2, -baseImage.height / 2);

    const rotatedBase = rCtx.getImageData(0, 0, rCanvas.width, rCanvas.height);

    // Rotate all cached modes physically
    const newCachedModes: Record<string, ImageData> = {};
    Object.keys(cachedModes).forEach(mode => {
      const cImgData = cachedModes[mode];
      const tmpC = document.createElement('canvas');
      tmpC.width = cImgData.width; tmpC.height = cImgData.height;
      tmpC.getContext('2d')!.putImageData(cImgData, 0, 0);

      const rotC = document.createElement('canvas');
      rotC.width = cImgData.height; rotC.height = cImgData.width;
      const rotCtx = rotC.getContext('2d')!;

      rotCtx.translate(rotC.width / 2, rotC.height / 2);
      rotCtx.rotate(90 * Math.PI / 180);
      rotCtx.drawImage(tmpC, -tmpC.width / 2, -tmpC.height / 2);

      newCachedModes[mode] = rotCtx.getImageData(0, 0, rotC.width, rotC.height);
    });

    // Update EXIF
    setOriginalDimensions(exifData.origH, exifData.origW); // Swap W and H

    setBaseImage(rotatedBase);
    setCachedModes(newCachedModes);

    if (viewportRef.current) {
      resetCamera(rotatedBase.width, rotatedBase.height, viewportRef.current.clientWidth, viewportRef.current.clientHeight);
    }

    setIsProcessing(false);
    showToast("Imagen girada 90° (Proceso instantáneo)");
  };

  const handleCrop = () => {
    setIsCropping(true);
  };

  const handleApplyCrop = (cropRect: { x: number, y: number, width: number, height: number }) => {
    setIsCropping(false);
    if (!baseImage) return;

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("RECORTANDO Y RE-PROCESANDO...");

    const cw = Math.floor(baseImage.width * cropRect.width);
    const ch = Math.floor(baseImage.height * cropRect.height);
    const cx = Math.floor(baseImage.width * cropRect.x);
    const cy = Math.floor(baseImage.height * cropRect.y);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cw;
    tempCanvas.height = ch;
    const ctx = tempCanvas.getContext('2d')!;

    // Draw original image portion
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      const croppedData = ctx.getImageData(0, 0, cw, ch);

      // Update dimensions
      setOriginalDimensions(cw, ch);

      // Send to worker as INIT_PROCESS because we need new matrices for the new crop
      workerRef.current?.postMessage({
        type: 'INIT_PROCESS',
        imageData: croppedData,
        scaleDown: false
      } as WorkerRequest);
    };
    // We need the original URL source. If we don't have it, we can draw from baseImage ImageData
    // Since baseImageData is what we have:
    const offCanvas = document.createElement('canvas');
    offCanvas.width = baseImage.width;
    offCanvas.height = baseImage.height;
    offCanvas.getContext('2d')!.putImageData(baseImage, 0, 0);
    img.src = offCanvas.toDataURL();
  };

  const downloadImage = () => {
    if (!canvasRef.current || !baseImage) return;

    // Build an off-screen canvas with the visual filter baked in (the on-screen canvas
    // applies the filter via CSS, which doesn't affect toDataURL output).
    let dataUrl: string;
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasRef.current.width;
      exportCanvas.height = canvasRef.current.height;
      const eCtx = exportCanvas.getContext('2d');
      if (eCtx) {
        if (!isShowingOriginal && cssFilterString && cssFilterString !== 'none') {
          eCtx.filter = cssFilterString;
        }
        eCtx.drawImage(canvasRef.current, 0, 0);
        dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      } else {
        dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      }
    } catch {
      dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `DStretch_${currentMode}_${Date.now()}.jpg`;
    a.click();
    showToast("Imagen descargada");
    if (!hasDownloaded) {
      localStorage.setItem('has-downloaded', '1');
      setHasDownloaded(true);
    }
    flashDonateBubble();
  }


  // Tutorial step definitions
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: '¡Bienvenido!',
      body: (
        <>
          Te voy a mostrar cómo usar la app en menos de un minuto. Vamos a procesar una imagen
          de demostración para que veas cómo funcionan los filtros DStretch.
        </>
      ),
      target: null,
      nextLabel: 'Empezar',
    },
    {
      id: 'cargar',
      title: 'Cargar una imagen',
      body: (
        <>
          Aquí cargas tus fotos de pictografías. Para el tutorial, vamos a usar una imagen
          de muestra — pulsa <b>Siguiente</b> para cargarla.
        </>
      ),
      target: '[data-tutorial="cargar"]',
      placement: 'bottom',
      nextLabel: 'Cargar demo',
      onEnter: () => {
        if (!baseImage) loadTutorialDemo();
      },
      settleMs: 100,
    },
    {
      id: 'dstretch',
      title: 'Algoritmos DStretch',
      body: (
        <>
          Estos botones aplican distintos algoritmos de decorrelación. <b>YDS</b> realza amarillos,
          <b> YBR</b> realza rojos, <b>LRE</b> es óptimo para ocres rupestres. Cada uno usa una
          matemática diferente para sacar a la luz pigmentos.
        </>
      ),
      target: '[data-tutorial="dstretch"]',
      placement: 'top',
      onEnter: () => {
        // Auto-apply YDS to show the effect
        if (baseImage) setCurrentMode('YDS');
      },
    },
    {
      id: 'visual-filters',
      title: 'Filtros visuales',
      body: (
        <>
          Aplica realce adicional encima del DStretch. Cada filtro tiene <b>parámetros ajustables
          </b> que aparecen al seleccionarlo: contraste, saturación, brillo, etc.
        </>
      ),
      target: '[data-tutorial="visual-filters"]',
      placement: 'top',
    },
    {
      id: 'eye',
      title: 'Ver el original',
      body: (
        <>
          <b>Mantén presionado</b> este botón con el ojo para ver la imagen original sin filtros.
          Suéltalo y vuelves al resultado procesado. Útil para comparar el "antes y después".
        </>
      ),
      target: '[data-tutorial="eye"]',
      placement: 'left',
    },
    {
      id: 'bake',
      title: 'Fijar filtro (acumular)',
      body: (
        <>
          Este botón <b>fija</b> el resultado actual como nueva base. Después puedes aplicar
          OTRO algoritmo encima — así combinas filtros (ej: YDS → fijar → LRE) para realces
          más profundos.
        </>
      ),
      target: '[data-tutorial="bake"]',
      placement: 'left',
    },
    {
      id: 'reset',
      title: 'Restaurar',
      body: (
        <>
          Vuelve a la imagen original sin filtros. Útil si te pierdes acumulando filtros y
          quieres empezar de cero.
        </>
      ),
      target: '[data-tutorial="reset"]',
      placement: 'left',
    },
    {
      id: 'menu',
      title: 'Menú de opciones',
      body: (
        <>
          Aquí encuentras: girar la imagen 90°, recortar a la vista actual, ver la metadata
          (cámara, GPS, fecha) y cerrar sesión.
        </>
      ),
      target: '[data-tutorial="menu"]',
      placement: 'bottom',
    },
    {
      id: 'donate',
      title: '☕ Apoya el proyecto',
      body: (
        <>
          Esta app es <b>100% gratis</b>. Si te ha sido útil, cualquier aporte ayuda a
          financiar hosting, almacenamiento y desarrollo. Toca este botón cuando quieras
          ver opciones de aporte (PayPal o transferencia). ¡Sin presión!
        </>
      ),
      target: '[data-tutorial="donate"]',
      placement: 'bottom',
    },
    {
      id: 'done',
      title: '¡Listo!',
      body: (
        <>
          Ya conoces lo básico. Sube tus propias fotos de pictografías y experimenta con los modos
          DStretch para ver cuál realza mejor tus pigmentos. Puedes volver a ver este tutorial
          desde el menú lateral.
        </>
      ),
      target: null,
      nextLabel: 'Empezar a usar',
    },
  ];

  const handleTutorialDone = () => {
    localStorage.setItem('tutorial-completed-v1', String(Date.now()));
    setShowTutorial(false);
  };

  const handleWelcomeContinue = () => {
    localStorage.setItem('welcome-completed-v1', String(Date.now()));
    setShowWelcome(false);
    setShowTutorial(true);
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) return <AuthGate />;

  return (
    <>
      <FirstTimeWelcome isOpen={showWelcome} onContinue={handleWelcomeContinue} />
      <Tutorial
        isOpen={showTutorial}
        steps={tutorialSteps}
        onComplete={handleTutorialDone}
        onSkip={handleTutorialDone}
      />
      <DonateModal isOpen={showDonate} onClose={() => setShowDonate(false)} />
      <InstallPrompt />
      {/* Toast Notification */}
      <div id="toast" className={`fixed left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl transition-all duration-300 z-[200] flex items-center gap-2 ${toastMsg ? 'top-5' : '-top-24'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>{toastMsg}</span>
      </div>

      <ResolutionModal
        isOpen={showResModal}
        dim={`${exifData.origW} x ${exifData.origH}px`}
        mp={`~${((exifData.origW * exifData.origH) / 1000000).toFixed(1)} Megapíxeles`}
        onOptimize={() => {
          if (!pendingRotatedImg) return;
          const img = pendingRotatedImg;
          setPendingRotatedImg(null); // free reference for GC
          startInitialProcessing(img, true);
        }}
        onNative={() => {
          if (!pendingRotatedImg) return;
          const img = pendingRotatedImg;
          setPendingRotatedImg(null);
          startInitialProcessing(img, false);
        }}
      />

      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        camera={`${exifData.make} ${exifData.model}`.trim()}
        date={exifData.date}
        resInfo={baseImage ? `${baseImage.width}x${baseImage.height}px` : '0x0 px'}
        gpsFull={(exifData.latDD && exifData.lonDD) ? `${exifData.latDD.toFixed(6)}, ${exifData.lonDD.toFixed(6)}` : 'No registradas en el archivo'}
      />

      {isCropping && canvasRef.current && (
        <FreeCrop
          imageUrl={canvasRef.current.toDataURL('image/jpeg', 0.8)}
          onApply={handleApplyCrop}
          onCancel={() => setIsCropping(false)}
        />
      )}

      {isProcessing && <Spinner progress={loadingProgress} message={loadingText} />}

      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-10 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center gap-1.5">
            <img src="/collasuyo.svg" alt="Logo" className="h-7" />
            <span className="text-red-500 font-bold text-xs mt-1.5 tracking-tighter uppercase">App</span>
          </div>
          {(uploadSync.pending > 0 || !uploadSync.online) && (
            <div
              onClick={() => uploadSync.online && uploadSync.sync()}
              className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 cursor-pointer ${uploadSync.online ? 'text-amber-400 bg-amber-950/40 border-amber-900/50' : 'text-slate-400 bg-slate-800 border-slate-700'}`}
              title={uploadSync.online ? 'Click para sincronizar' : 'Sin conexión — se sincronizará al volver'}
            >
              {uploadSync.syncing && <span className="w-2 h-2 rounded-full border border-amber-400 border-t-transparent animate-spin"></span>}
              {!uploadSync.online && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636L5.636 18.364m12.728 0L5.636 5.636" /></svg>
              )}
              {uploadSync.pending} pend.
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label data-tutorial="cargar" className="bg-red-600 active:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold cursor-pointer shadow-lg shadow-red-900/20 transition-colors flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Cargar
            <input type="file" accept="image/png, image/jpeg, image/webp, image/raw, image/cr2, image/nef, image/arw, image/dng, .png, .jpg, .jpeg, .webp, .raw, .cr2, .nef, .arw, .dng, image/*" className="hidden" onChange={handleUpload} />
          </label>

          {baseImage && (
            <>
              <button onClick={downloadImage} className="text-emerald-400 bg-emerald-950/50 px-3 py-1.5 rounded-lg active:bg-emerald-900/80 transition-colors border border-emerald-900/50 flex items-center gap-1.5 text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0l-5-5m5 5l5-5M5 21h14" />
                </svg>
                Descargar
              </button>
            </>
          )}
        </div>
      </header>

      {/* Push permission banner (admin only, opt-in) */}
      {isAdmin && <PushPermissionBanner />}

      {/* Admin tab bar */}
      {isAdmin && (
        <div className="shrink-0 bg-slate-900 border-b border-slate-800 flex">
          {([
            { id: 'editor', label: 'Editor' },
            { id: 'feed', label: 'Feed' },
            { id: 'users', label: 'Usuarios' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeTab === t.id ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-950/30' : 'text-slate-500 border-b-2 border-transparent hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Admin views */}
      {isAdmin && activeTab === 'feed' && <Feed />}
      {isAdmin && activeTab === 'users' && <UsersList />}

      {/* Editor (default for everyone) */}
      <main
        ref={viewportRef}
        className={`flex-1 min-h-0 w-full relative overflow-hidden bg-slate-950 flex items-center justify-center touch-none ${isAdmin && activeTab !== 'editor' ? 'hidden' : ''}`}
        {...gestureEvents}
      >
        {/* Top left Meta Bar + Donate button (side-by-side) */}
        {baseImage && (
          <div className="absolute top-2.5 left-2.5 z-15 flex flex-col items-start gap-2">
            <div className="bg-slate-900/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-slate-400 flex items-center gap-3 border border-slate-700 shadow-lg pointer-events-none">
              <span className="font-mono">{baseImage.width}x{baseImage.height}px</span>
              <span className={`flex items-center gap-1 ${exifData.latDD ? 'text-emerald-400' : 'text-slate-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {exifData.latDD ? `${exifData.latDD.toFixed(4)}, ${exifData.lonDD?.toFixed(4)}` : 'Sin GPS'}
              </span>
            </div>
            <button
              data-tutorial="donate"
              onClick={() => setShowDonate(true)}
              title="Regálame un café"
              aria-hidden={!donateBubbleVisible}
              tabIndex={donateBubbleVisible ? 0 : -1}
              className={`backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 border shadow-lg uppercase tracking-wider font-semibold transition-all duration-300
                ${donateBubbleVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}
                ${hasDownloaded
                  ? 'bg-amber-500/95 hover:bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-900/75 hover:bg-slate-800 text-slate-400 border-slate-700'}`}
            >
              <span className="text-sm leading-none">☕</span>
              <span>Regálame un café</span>
            </button>
          </div>
        )}

        {/* Top Right Menu */}
        {baseImage && (
          <div className="absolute top-2.5 right-2.5 z-30">
            <button
              data-tutorial="menu"
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen) }}
              className="w-9 h-9 rounded-lg bg-slate-800/90 text-slate-200 flex items-center justify-center border border-slate-600 shadow-lg backdrop-blur-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {isMenuOpen && (
              <div className="absolute top-[46px] right-0 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl w-[180px] flex flex-col overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                <button onClick={handleRotate} className="px-4 py-3 text-slate-200 text-sm font-semibold flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800 active:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Girar 90°
                </button>
                <button onClick={handleCrop} className="px-4 py-3 text-slate-200 text-sm font-semibold flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800 active:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                  Recortar a la Vista
                </button>
                <button onClick={() => { setIsMenuOpen(false); setShowInfoModal(true); }} className="px-4 py-3 text-slate-200 text-sm font-semibold flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800 active:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Info de Imagen
                </button>
                <button onClick={() => { setIsMenuOpen(false); setShowTutorial(true); }} className="px-4 py-3 text-slate-200 text-sm font-semibold flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800 active:bg-emerald-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.5h.01" /></svg>
                  Ver tutorial
                </button>
                <button onClick={() => { setIsMenuOpen(false); setShowDonate(true); }} className="px-4 py-3 text-slate-200 text-sm font-semibold flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800 active:bg-amber-600 transition-colors">
                  <span className="text-base leading-none">☕</span>
                  Apoyar el proyecto
                </button>
                <div className="px-4 py-2 text-[10px] text-slate-500 border-b border-slate-800 truncate" title={user?.email ?? ''}>
                  {user?.email}
                </div>
                <button onClick={async () => { setIsMenuOpen(false); await logout(); }} className="px-4 py-3 text-red-400 text-sm font-semibold flex items-center gap-3 hover:bg-slate-800 active:bg-red-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!baseImage && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 mb-3 opacity-40 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <p className="text-xs uppercase tracking-widest font-semibold text-slate-500">Carga una foto para iniciar</p>
          </div>
        )}

        {/* Crop Grid */}
        <div className={`absolute inset-0 z-[12] pointer-events-none transition-opacity duration-200 flex flex-col ${showCropGrid ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-full h-[33.33%] border-b border-dashed border-white/40"></div>
          <div className="w-full h-[33.33%] border-b border-dashed border-white/40"></div>
          <div className="absolute top-0 bottom-0 left-[33.33%] border-r border-dashed border-white/40"></div>
          <div className="absolute top-0 bottom-0 left-[66.66%] border-r border-dashed border-white/40"></div>
          <div className="absolute inset-0 border-2 border-blue-500/60 shadow-[inset_0_0_0_2000px_rgba(0,0,0,0.1)]"></div>
        </div>

        {/* The Canvas */}
        <canvas
          ref={canvasRef}
          className="shadow-[0_4px_30px_rgba(0,0,0,0.8)] origin-center will-change-transform z-[1] transition-[filter] duration-100 ease-linear"
          style={{
            transform: `translate(${originX}px, ${originY}px) scale(${scale})`,
            filter: cssFilterString,
          }}
        />

        <FloatingTools
          isVisible={!!baseImage}
          onShowOriginalStart={() => setIsShowingOriginal(true)}
          onShowOriginalEnd={() => setIsShowingOriginal(false)}
          onBake={handleBake}
          onReset={handleReset}
          isShowingOriginal={isShowingOriginal}
        />
      </main>

      <ControlsPanel
        isVisible={!!baseImage && !isCropping && (!isAdmin || activeTab === 'editor')}
        previews={previews}
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
        filterParams={filterParams}
        onFilterParamChange={(filterId, paramId, val) => {
          setFilterParams(prev => ({
            ...prev,
            [filterId]: { ...(prev[filterId] || {}), [paramId]: val }
          }));
        }}
        onResetFilterParams={(filterId) => {
          setFilterParams(prev => ({ ...prev, [filterId]: buildFilterDefaults(filterId) }));
        }}
      />
    </>
  );
}
