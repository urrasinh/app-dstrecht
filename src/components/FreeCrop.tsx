import React, { useRef, useState, useEffect } from 'react';

interface FreeCropProps {
    imageUrl: string;
    onApply: (cropRect: { x: number, y: number, width: number, height: number }) => void;
    onCancel: () => void;
}

export function FreeCrop({ imageUrl, onApply, onCancel }: FreeCropProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [imgRect, setImgRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [crop, setCrop] = useState<{ x: number, y: number, w: number, h: number }>({ x: 0, y: 0, w: 100, h: 100 });

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<string | null>(null); // 'move', 'nw', 'ne', 'sw', 'se'
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startCrop, setStartCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });

    useEffect(() => {
        // Measure image once loaded
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            if (containerRef.current) {
                const cRect = containerRef.current.getBoundingClientRect();
                const containerRatio = cRect.width / cRect.height;
                const imgRatio = img.width / img.height;

                let drawW = cRect.width;
                let drawH = cRect.height;
                let offsetX = 0;
                let offsetY = 0;

                // Object-fit: contain logic
                if (imgRatio > containerRatio) {
                    drawH = drawW / imgRatio;
                    offsetY = (cRect.height - drawH) / 2;
                } else {
                    drawW = drawH * imgRatio;
                    offsetX = (cRect.width - drawW) / 2;
                }

                setImgRect({ x: offsetX, y: offsetY, w: drawW, h: drawH });
                // Initial crop (e.g., 80% centered)
                setCrop({
                    x: offsetX + drawW * 0.1,
                    y: offsetY + drawH * 0.1,
                    w: drawW * 0.8,
                    h: drawH * 0.8
                });
            }
        };
    }, [imageUrl]);

    const handlePointerDown = (e: React.PointerEvent, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragType(type);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartCrop({ ...crop });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !imgRect) return;

        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;

        let newCrop = { ...startCrop };
        const minSize = 40;

        if (dragType === 'move') {
            newCrop.x = Math.max(imgRect.x, Math.min(imgRect.x + imgRect.w - newCrop.w, startCrop.x + dx));
            newCrop.y = Math.max(imgRect.y, Math.min(imgRect.y + imgRect.h - newCrop.h, startCrop.y + dy));
        } else if (dragType === 'nw') {
            const newX = Math.min(startCrop.x + dx, startCrop.x + startCrop.w - minSize);
            const newY = Math.min(startCrop.y + dy, startCrop.y + startCrop.h - minSize);
            newCrop.x = Math.max(imgRect.x, newX);
            newCrop.y = Math.max(imgRect.y, newY);
            newCrop.w = startCrop.w + (startCrop.x - newCrop.x);
            newCrop.h = startCrop.h + (startCrop.y - newCrop.y);
        } else if (dragType === 'ne') {
            const newY = Math.min(startCrop.y + dy, startCrop.y + startCrop.h - minSize);
            newCrop.y = Math.max(imgRect.y, newY);
            newCrop.h = startCrop.h + (startCrop.y - newCrop.y);
            newCrop.w = Math.max(minSize, Math.min(imgRect.w - (startCrop.x - imgRect.x), startCrop.w + dx));
        } else if (dragType === 'sw') {
            const newX = Math.min(startCrop.x + dx, startCrop.x + startCrop.w - minSize);
            newCrop.x = Math.max(imgRect.x, newX);
            newCrop.w = startCrop.w + (startCrop.x - newCrop.x);
            newCrop.h = Math.max(minSize, Math.min(imgRect.h - (startCrop.y - imgRect.y), startCrop.h + dy));
        } else if (dragType === 'se') {
            newCrop.w = Math.max(minSize, Math.min(imgRect.w - (startCrop.x - imgRect.x), startCrop.w + dx));
            newCrop.h = Math.max(minSize, Math.min(imgRect.h - (startCrop.y - imgRect.y), startCrop.h + dy));
        }

        setCrop(newCrop);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        setDragType(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const handleApply = () => {
        if (!imgRect) return;
        // Convert screen coordinates to relative image coordinates (0.0 to 1.0)
        const relativeCrop = {
            x: (crop.x - imgRect.x) / imgRect.w,
            y: (crop.y - imgRect.y) / imgRect.h,
            width: crop.w / imgRect.w,
            height: crop.h / imgRect.h
        };
        onApply(relativeCrop);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-10 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onCancel} className="text-white p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-white font-bold text-sm tracking-widest uppercase">Recorte</div>
                <button onClick={handleApply} className="text-blue-500 font-bold p-2 uppercase text-sm">Listo</button>
            </div>

            {/* Container */}
            <div
                ref={containerRef}
                className="w-full h-full relative overflow-hidden"
                style={{ touchAction: 'none' }}
            >
                {/* Base Image */}
                <div
                    className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-30"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />

                {imgRect && (
                    <>
                        {/* Cropped area showing the actual image clearly */}
                        <div
                            className="absolute bg-no-repeat"
                            style={{
                                left: crop.x, top: crop.y, width: crop.w, height: crop.h,
                                backgroundImage: `url(${imageUrl})`,
                                backgroundSize: `${imgRect.w}px ${imgRect.h}px`,
                                backgroundPosition: `-${crop.x - imgRect.x}px -${crop.y - imgRect.y}px`
                            }}
                        />

                        {/* Interactive UI Overlay */}
                        <div
                            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move"
                            style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                            onPointerDown={(e) => handlePointerDown(e, 'move')}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            {/* Grid Lines (Rule of Thirds) */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                <div className="border-r border-b border-white/30" />
                                <div className="border-r border-b border-white/30" />
                                <div className="border-b border-white/30" />
                                <div className="border-r border-b border-white/30" />
                                <div className="border-r border-b border-white/30" />
                                <div className="border-b border-white/30" />
                                <div className="border-r border-white/30" />
                                <div className="border-r border-white/30" />
                                <div />
                            </div>

                            {/* Handles */}
                            <div className="absolute -left-3 -top-3 w-6 h-6 border-l-4 border-t-4 border-white cursor-nwse-resize bg-transparent" onPointerDown={(e) => handlePointerDown(e, 'nw')} />
                            <div className="absolute -right-3 -top-3 w-6 h-6 border-r-4 border-t-4 border-white cursor-nesw-resize bg-transparent" onPointerDown={(e) => handlePointerDown(e, 'ne')} />
                            <div className="absolute -left-3 -bottom-3 w-6 h-6 border-l-4 border-b-4 border-white cursor-nesw-resize bg-transparent" onPointerDown={(e) => handlePointerDown(e, 'sw')} />
                            <div className="absolute -right-3 -bottom-3 w-6 h-6 border-r-4 border-b-4 border-white cursor-nwse-resize bg-transparent" onPointerDown={(e) => handlePointerDown(e, 'se')} />
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 h-24 flex items-center justify-center gap-8 bg-gradient-to-t from-black to-transparent px-6 pb-6 pt-4">
                <button onClick={onCancel} className="bg-slate-800 text-white px-6 py-3 rounded-2xl flex-1 max-w-[160px] font-bold">Cancelar</button>
                <button onClick={handleApply} className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex-1 max-w-[160px] font-bold shadow-lg shadow-blue-900/30">Aplicar Recorte</button>
            </div>

        </div>
    );
}
