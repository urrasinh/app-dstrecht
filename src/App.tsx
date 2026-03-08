import React, { useState, useEffect, useRef } from 'react';
import { useExif } from './hooks/useExif';
import { useGestures } from './hooks/useGestures';
import { MODES, VISUAL_FILTERS } from './utils/dstretch';
import type { WorkerRequest, WorkerResponse } from './types';

import { ADVANCED_FILTERS } from './utils/filters';

import { InfoModal } from './components/InfoModal';
import { ResolutionModal } from './components/ResolutionModal';
import { ControlsPanel } from './components/ControlsPanel';
import { FloatingTools } from './components/FloatingTools';
import { AdvancedFiltersPanel } from './components/AdvancedFiltersPanel';
import { FreeCrop } from './components/FreeCrop';
import { Spinner } from './components/Spinner';

import './index.css';

export default function App() {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);


  // State: Filters
  const [currentMode, setCurrentMode] = useState('YDS');
  const [currentFilter, setCurrentFilter] = useState('Normal');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [intensity, setIntensity] = useState(100);

  // State: Advanced Filters & Cropping
  const [activeAdvancedFilter, setActiveAdvancedFilter] = useState<string | null>(null);
  const [advancedFilterParams, setAdvancedFilterParams] = useState<Record<string, Record<string, number>>>({});
  const [advancedPreviews, setAdvancedPreviews] = useState<Record<string, string>>({});
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
      } else if (res.type === 'SUCCESS') {
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
      } else if (res.type === 'ADVANCED_PREVIEWS_SUCCESS') {
        const previewsObj: Record<string, string> = {};

        // Convert ImageData to canvas to dataURL for UI display
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          res.previews.forEach(p => {
            tempCanvas.width = p.imageData.width;
            tempCanvas.height = p.imageData.height;
            tempCtx.putImageData(p.imageData, 0, 0);
            previewsObj[p.filterId] = tempCanvas.toDataURL('image/jpeg', 0.6);
          });
        }

        setAdvancedPreviews(previewsObj);

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


  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("ANALIZANDO IMAGEN...");

    try {
      // 1. Intentar extraer metadatos de forma asíncrona pero sin bloquear la carga si falla
      let orientation = 1;
      try {
        orientation = await extractExif(file);
      } catch (exifErr) {
        console.warn("Exif extraction failed, using default orientation 1", exifErr);
      }

      setLoadingText("DECODIFICANDO IMAGEN...");

      // 2. Método Híbrido Robusto: Usar FileReader + Image Nativa para mejor compatibilidad cruzada
      const reader = new FileReader();

      reader.onerror = () => {
        throw new Error("No se pudo leer el archivo físico.");
      };

      reader.onload = (event) => {
        if (!event.target?.result) {
          setIsProcessing(false);
          showToast("Error leyendo archivo");
          return;
        }

        const img = new Image();
        img.onerror = () => {
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
              setPendingRotatedImg(rotatedImg);
              setOriginalDimensions(rotatedImg.width, rotatedImg.height);
              setIsProcessing(false);
              setShowResModal(true);
            };

            // Generate highest quality JPEG to pass to canvas to strip away exotic properties 
            // from some WEBP/HEIC/RAWs that Safari/Chrome might struggle with in Canvas get/putImageData
            rotatedImg.src = oCanvas.toDataURL('image/jpeg', 1.0);

          } catch (canvasErr) {
            console.error("Canvas manipulation failed", canvasErr);
            setIsProcessing(false);
            showToast("Error procesando imagen para web.");
          }
        };
        img.src = event.target.result as string;
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error("Upload handler total failure", error);
      setIsProcessing(false);
      showToast("Error de subida inesperado.");
    }
  };

  const startInitialProcessing = (img: HTMLImageElement, scaleDown: boolean) => {
    setShowResModal(false);
    resetAllFiltersUI();
    setIsProcessing(true);
    setLoadingProgress(0);

    // Convert Image to ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tCtx = tempCanvas.getContext('2d')!;
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = 'high';
    tCtx.drawImage(img, 0, 0, img.width, img.height);
    const imageData = tCtx.getImageData(0, 0, img.width, img.height);

    workerRef.current?.postMessage({
      type: 'INIT_PROCESS',
      imageData,
      scaleDown
    } as WorkerRequest);
  };

  const handleApplyAdvancedFilter = () => {
    if (!baseImage || !activeAdvancedFilter || !workerRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingText("APLICANDO FILTRO AVANZADO...");

    // Si el usuario quiere aplicarlo sobre TODO, podríamos mandar la imagen base original,
    // o podríamos mandarla sobre lo que actualmente está viendo en el canvas filtrado. 
    // Para simplificar, obtenemos la ImageData del canvas actual.
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = canvasRef.current.width;
    sourceCanvas.height = canvasRef.current.height;
    sourceCanvas.getContext('2d')!.drawImage(canvasRef.current, 0, 0);
    const currentImageData = sourceCanvas.getContext('2d')!.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    const params = advancedFilterParams[activeAdvancedFilter] || {};

    workerRef.current.postMessage({
      type: 'PROCESS_ADVANCED_FILTER',
      imageData: currentImageData,
      filterId: activeAdvancedFilter,
      params
    });
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

    // Trigger Advanced Previews in Worker
    workerRef.current?.postMessage({
      type: 'GENERATE_ADVANCED_PREVIEWS',
      previewImageData: previewBaseData
    });
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
    ctx.save();

    if (!isShowingOriginal) {
      let filterStr = VISUAL_FILTERS[currentFilter as keyof typeof VISUAL_FILTERS](intensity);
      filterStr += ` brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.filter = filterStr;
    }

    ctx.drawImage(off, 0, 0);
    ctx.restore();

  }, [baseImage, cachedModes, currentMode, isShowingOriginal, currentFilter, intensity, brightness, contrast]);


  const resetAllFiltersUI = () => {
    setCurrentMode('ORIGINAL');
    setCurrentFilter('Normal');
    setBrightness(100);
    setContrast(100);
    setIntensity(100);
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
    let filterStr = VISUAL_FILTERS[currentFilter as keyof typeof VISUAL_FILTERS](intensity);
    filterStr += ` brightness(${brightness}%) contrast(${contrast}%)`;
    bCtx.filter = filterStr;

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
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
    a.download = `DStretch_${currentMode}_${Date.now()}.jpg`;
    a.click();
    showToast("Imagen descargada");
  }


  return (
    <>
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
        onOptimize={() => pendingRotatedImg && startInitialProcessing(pendingRotatedImg, true)}
        onNative={() => pendingRotatedImg && startInitialProcessing(pendingRotatedImg, false)}
      />

      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        camera={`${exifData.make} ${exifData.model}`.trim()}
        date={exifData.date}
        resInfo={baseImage ? `${baseImage.width}x${baseImage.height}px` : '0x0 px'}
        gpsFull={(exifData.latDD && exifData.lonDD) ? `${exifData.latDD.toFixed(6)}, ${exifData.lonDD.toFixed(6)}` : 'No registradas en el archivo'}
      />

      <AdvancedFiltersPanel
        isVisible={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        filters={ADVANCED_FILTERS}
        activeFilterId={activeAdvancedFilter}
        filterParams={advancedFilterParams}
        onFilterSelect={(id) => {
          setActiveAdvancedFilter(id);
          if (!advancedFilterParams[id]) {
            const def = ADVANCED_FILTERS.find(f => f.id === id);
            const defaultParams: Record<string, number> = {};
            def?.params.forEach(p => defaultParams[p.id] = p.default);
            setAdvancedFilterParams(prev => ({ ...prev, [id]: defaultParams }));
          }
        }}
        onParamChange={(filterId, paramId, value) => {
          setAdvancedFilterParams(prev => ({
            ...prev,
            [filterId]: {
              ...(prev[filterId] || {}),
              [paramId]: value
            }
          }));
        }}
        onApply={handleApplyAdvancedFilter}
        isProcessing={isProcessing}
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
        </div>
        <div className="flex items-center gap-2">
          <label className="bg-red-600 active:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold cursor-pointer shadow-lg shadow-red-900/20 transition-colors flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Cargar
            <input type="file" accept="image/png, image/jpeg, image/webp, image/raw, image/cr2, image/nef, image/arw, image/dng, .png, .jpg, .jpeg, .webp, .raw, .cr2, .nef, .arw, .dng, image/*" className="hidden" onChange={handleUpload} />
          </label>

          {baseImage && (
            <>
              <button
                onClick={() => setShowAdvancedFilters(true)}
                className="text-blue-400 font-bold text-xs bg-blue-950/40 px-3 py-1.5 rounded-lg active:bg-blue-900/80 transition-colors border border-blue-900/50 flex gap-1.5 items-center justify-center uppercase tracking-wide hover:bg-blue-900/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span className="hidden sm:inline">Expertos</span>
              </button>

              <button onClick={downloadImage} className="text-emerald-400 bg-emerald-950/50 p-1.5 rounded-lg active:bg-emerald-900/80 transition-colors border border-emerald-900/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <main
        ref={viewportRef}
        className="h-[55dvh] w-full relative overflow-hidden bg-slate-950 flex items-center justify-center touch-none shrink-0"
        {...gestureEvents}
      >
        {/* Top left Meta Bar */}
        {baseImage && (
          <div className="absolute top-2.5 left-2.5 bg-slate-900/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-slate-400 z-15 flex gap-4 border border-slate-700 shadow-lg pointer-events-none">
            <span className="font-mono">{baseImage.width}x{baseImage.height}px</span>
            <span className={`flex items-center gap-1 ${exifData.latDD ? 'text-emerald-400' : 'text-slate-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {exifData.latDD ? `${exifData.latDD.toFixed(4)}, ${exifData.lonDD?.toFixed(4)}` : 'Sin GPS'}
            </span>
          </div>
        )}

        {/* Top Right Menu */}
        {baseImage && (
          <div className="absolute top-2.5 right-2.5 z-30">
            <button
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
                <button onClick={() => { setIsMenuOpen(false); setShowInfoModal(true); }} className="px-4 py-3 text-slate-200 text-sm font-semibold flex items-center gap-3 hover:bg-slate-800 active:bg-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Info de Imagen
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
          style={{ transform: `translate(${originX}px, ${originY}px) scale(${scale})` }}
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
        isVisible={!!baseImage && !isCropping}
        previews={previews}
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
        brightness={brightness}
        setBrightness={setBrightness}
        contrast={contrast}
        setContrast={setContrast}
        intensity={intensity}
        setIntensity={setIntensity}
        onCropBtn={handleCrop}
        advancedPreviews={advancedPreviews}
        activeAdvancedFilter={activeAdvancedFilter}
        onSelectAdvancedFilter={setActiveAdvancedFilter}
        advancedFilterParams={advancedFilterParams}
        onParamChange={(filterId, paramId, value) => {
          setAdvancedFilterParams(prev => ({
            ...prev,
            [filterId]: {
              ...(prev[filterId] || {}),
              [paramId]: value
            }
          }));
        }}
        onApplyAdvancedFilter={handleApplyAdvancedFilter}
        isProcessing={isProcessing}
      />
    </>
  );
}
