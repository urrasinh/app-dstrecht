import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';

export interface TutorialStep {
    id: string;
    title: string;
    body: React.ReactNode;
    /** CSS selector for the element to highlight. Null = centered modal. */
    target?: string | null;
    /** Side of target to place tooltip. Default 'auto' picks best fit. */
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    /** Action triggered when this step becomes active. */
    onEnter?: () => void | Promise<void>;
    /** Custom label for the next button. */
    nextLabel?: string;
    /** Wait this many ms after onEnter before showing the tooltip (lets UI settle). */
    settleMs?: number;
}

interface TutorialProps {
    isOpen: boolean;
    steps: TutorialStep[];
    onComplete: () => void;
    onSkip: () => void;
}

const PADDING = 8;
const TOOLTIP_W = 320;
const TOOLTIP_GAP = 14;

interface TargetRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export const Tutorial: React.FC<TutorialProps> = ({ isOpen, steps, onComplete, onSkip }) => {
    const [stepIdx, setStepIdx] = useState(0);
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const [tooltipReady, setTooltipReady] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const enteredStepRef = useRef<string | null>(null);

    const step = steps[stepIdx];
    const isLast = stepIdx === steps.length - 1;

    // Reset state when tutorial opens
    useEffect(() => {
        if (isOpen) {
            setStepIdx(0);
            enteredStepRef.current = null;
        }
    }, [isOpen]);

    // Run onEnter when entering a new step (use stable stepIdx as dep)
    useEffect(() => {
        if (!isOpen) return;
        const s = steps[stepIdx];
        if (!s) return;
        if (enteredStepRef.current === s.id) return;
        enteredStepRef.current = s.id;
        setTooltipReady(false);
        const settle = s.settleMs ?? 60;

        Promise.resolve(s.onEnter?.()).finally(() => {
            setTimeout(() => setTooltipReady(true), settle);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, stepIdx]);

    // Measure target on every step change + on resize/scroll
    const measure = useCallback(() => {
        if (!step || !tooltipReady) return;
        if (!step.target) {
            setTargetRect(null);
            return;
        }
        const el = document.querySelector<HTMLElement>(step.target);
        if (!el) {
            setTargetRect(null);
            return;
        }
        const rect = el.getBoundingClientRect();
        // Scroll the target into view if mostly off-screen
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        setTargetRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        });
    }, [step, tooltipReady]);

    useLayoutEffect(() => {
        measure();
    }, [measure]);

    useEffect(() => {
        if (!isOpen) return;
        const onResize = () => measure();
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        const interval = setInterval(measure, 250); // re-measure for layout shifts
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            clearInterval(interval);
        };
    }, [isOpen, measure]);

    if (!isOpen || !step) return null;

    const next = () => {
        if (isLast) onComplete();
        else setStepIdx(i => i + 1);
    };
    const prev = () => setStepIdx(i => Math.max(0, i - 1));

    // Compute tooltip position
    const tooltipPos = computeTooltipPos(targetRect, step.placement, tooltipRef.current?.offsetHeight ?? 200);

    return (
        <>
            {/* SVG overlay with cutout */}
            <div className="fixed inset-0 z-[500] pointer-events-auto" style={{ touchAction: 'none' }}>
                <svg
                    width="100%"
                    height="100%"
                    style={{ position: 'absolute', inset: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    <defs>
                        <mask id="tutorial-cutout">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - PADDING}
                                    y={targetRect.top - PADDING}
                                    width={targetRect.width + PADDING * 2}
                                    height={targetRect.height + PADDING * 2}
                                    rx="12"
                                    ry="12"
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(20, 16, 12, 0.85)"
                        mask="url(#tutorial-cutout)"
                    />
                </svg>

                {/* Highlight ring around target */}
                {targetRect && (
                    <div
                        className="absolute pointer-events-none animate-pulse"
                        style={{
                            left: targetRect.left - PADDING,
                            top: targetRect.top - PADDING,
                            width: targetRect.width + PADDING * 2,
                            height: targetRect.height + PADDING * 2,
                            border: '2px solid rgb(201, 168, 97)',
                            borderRadius: 12,
                            boxShadow: '0 0 0 4px rgba(201, 168, 97, 0.22)',
                        }}
                    />
                )}

                {/* Tooltip */}
                {tooltipReady && (
                    <div
                        ref={tooltipRef}
                        className="absolute bg-tierra-900 border border-ocre-500/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                        style={{
                            left: tooltipPos.left,
                            top: tooltipPos.top,
                            width: TOOLTIP_W,
                            maxWidth: 'calc(100vw - 24px)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-ocre-400 uppercase tracking-widest">
                                {stepIdx + 1} de {steps.length}
                            </span>
                            <button
                                onClick={onSkip}
                                className="text-[10px] text-crema-400 hover:text-white uppercase tracking-wider"
                            >
                                Saltar
                            </button>
                        </div>

                        <h3 className="text-base font-bold text-white">{step.title}</h3>
                        <div className="text-xs text-crema-300 leading-relaxed">{step.body}</div>

                        {/* Progress dots */}
                        <div className="flex gap-1 justify-center pt-1">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === stepIdx ? 'w-5 bg-ocre-500' : i < stepIdx ? 'w-1.5 bg-ocre-700' : 'w-1.5 bg-tierra-700'}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2 mt-1">
                            {stepIdx > 0 && (
                                <button
                                    onClick={prev}
                                    className="px-3 py-2 text-[11px] font-semibold text-crema-300 hover:text-white bg-tierra-800 rounded-lg"
                                >
                                    Atrás
                                </button>
                            )}
                            <button
                                onClick={next}
                                className="flex-1 py-2 text-[11px] font-bold uppercase tracking-wider bg-ocre-600 hover:bg-ocre-500 text-white rounded-lg"
                            >
                                {step.nextLabel ?? (isLast ? 'Empezar' : 'Siguiente')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </>
    );
};

/** Choose tooltip position based on target rect and viewport. */
function computeTooltipPos(
    target: TargetRect | null,
    placement: TutorialStep['placement'] = 'auto',
    estimatedH = 220
): { left: number; top: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(TOOLTIP_W, vw - 24);

    // No target → center
    if (!target) {
        return {
            left: Math.max(12, (vw - w) / 2),
            top: Math.max(12, (vh - estimatedH) / 2),
        };
    }

    // Decide placement
    let p = placement;
    if (p === 'auto') {
        const spaceBelow = vh - (target.top + target.height);
        const spaceAbove = target.top;
        if (spaceBelow >= estimatedH + TOOLTIP_GAP) p = 'bottom';
        else if (spaceAbove >= estimatedH + TOOLTIP_GAP) p = 'top';
        else p = 'bottom';
    }

    let left: number;
    let top: number;

    switch (p) {
        case 'top':
            left = target.left + target.width / 2 - w / 2;
            top = target.top - estimatedH - TOOLTIP_GAP;
            break;
        case 'bottom':
            left = target.left + target.width / 2 - w / 2;
            top = target.top + target.height + TOOLTIP_GAP;
            break;
        case 'left':
            left = target.left - w - TOOLTIP_GAP;
            top = target.top + target.height / 2 - estimatedH / 2;
            break;
        case 'right':
            left = target.left + target.width + TOOLTIP_GAP;
            top = target.top + target.height / 2 - estimatedH / 2;
            break;
        default:
            left = target.left;
            top = target.top + target.height + TOOLTIP_GAP;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, vw - w - 12));
    top = Math.max(12, Math.min(top, vh - estimatedH - 12));
    return { left, top };
}
