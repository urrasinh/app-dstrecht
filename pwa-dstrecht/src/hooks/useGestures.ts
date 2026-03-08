import { useState, useCallback, useRef } from 'react';

export function useGestures(showGridCallback: () => void, hideGridCallback: () => void) {
    const [scale, setScale] = useState(1);
    const [originX, setOriginX] = useState(0);
    const [originY, setOriginY] = useState(0);

    const isDragging = useRef(false);
    const lastTouchPos = useRef({ x: 0, y: 0 });
    const initialDistance = useRef<number | null>(null);
    const initialScale = useRef(1);

    const resetCamera = useCallback((baseWidth: number, baseHeight: number, viewportWidth: number, viewportHeight: number) => {
        if (!baseWidth || !baseHeight) return;
        const newScale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight) * 0.95;
        setScale(newScale);
        setOriginX(0);
        setOriginY(0);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        showGridCallback();
        if (e.touches.length === 2) {
            initialDistance.current = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialScale.current = scale;
        } else if (e.touches.length === 1) {
            isDragging.current = true;
            lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, [scale, showGridCallback]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && initialDistance.current) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const newScale = Math.min(Math.max(0.1, initialScale.current * (currentDist / initialDistance.current)), 25);
            setScale(newScale);
        } else if (e.touches.length === 1 && isDragging.current) {
            const dx = e.touches[0].clientX - lastTouchPos.current.x;
            const dy = e.touches[0].clientY - lastTouchPos.current.y;
            setOriginX(prev => prev + dx);
            setOriginY(prev => prev + dy);
            lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        initialDistance.current = null;
        isDragging.current = false;
        hideGridCallback();
    }, [hideGridCallback]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        showGridCallback();
        isDragging.current = true;
        lastTouchPos.current = { x: e.clientX, y: e.clientY };
    }, [showGridCallback]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging.current) {
            const dx = e.clientX - lastTouchPos.current.x;
            const dy = e.clientY - lastTouchPos.current.y;
            setOriginX(prev => prev + dx);
            setOriginY(prev => prev + dy);
            lastTouchPos.current = { x: e.clientX, y: e.clientY };
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        hideGridCallback();
    }, [hideGridCallback]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        showGridCallback();
        setScale(prev => {
            const newScale = Math.min(Math.max(0.1, prev * (e.deltaY > 0 ? 0.9 : 1.1)), 25);
            return newScale;
        });
        hideGridCallback();
    }, [showGridCallback, hideGridCallback]);

    return {
        scale,
        originX,
        originY,
        resetCamera,
        events: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onMouseDown: handleMouseDown,
        },
        // Export raw listeners to attach to window/viewport refs
        handleMouseMove,
        handleMouseUp,
        handleWheel
    };
}
