import type { AdvancedFilterDef } from '../types';

export const ADVANCED_FILTERS: AdvancedFilterDef[] = [
    // --- GLOBAL ADJUSTMENTS ---
    {
        id: 'HISTOGRAM_EQ',
        name: 'Ecualización de Histograma',
        description: 'Aumenta el contraste global de forma no lineal. Ideal para petroglifos con poca profundidad.',
        category: 'GLOBAL',
        params: [
            { id: 'intensity', label: 'Intensidad de Mezcla', type: 'slider', min: 0, max: 100, step: 1, default: 100 }
        ]
    },
    {
        id: 'BRIGHTNESS_CONTRAST',
        name: 'Brillo y Contraste Fuerte',
        description: 'Ajuste directo de luminancia. Útil en combinación con otros filtros DStretch.',
        category: 'GLOBAL',
        params: [
            { id: 'brightness', label: 'Brillo', type: 'slider', min: -100, max: 100, step: 1, default: 0 },
            { id: 'contrast', label: 'Contraste', type: 'slider', min: -100, max: 100, step: 1, default: 50 }
        ]
    },

    // --- CHANNELS & SPACES ---
    {
        id: 'RGB_ISOLATION',
        name: 'Aislamiento de Canal RGB',
        description: 'Mantiene un solo canal de color para ver trazados específicos disimulados en la roca.',
        category: 'CHANNELS',
        params: [
            { id: 'channel', label: 'Canal (0=Rojo, 1=Verde, 2=Azul)', type: 'slider', min: 0, max: 2, step: 1, default: 0 },
            { id: 'boost', label: 'Realce', type: 'slider', min: 1, max: 3, step: 0.1, default: 1.5 }
        ]
    },
    {
        id: 'LAB_LUMINANCE',
        name: 'Modificación de Luminancia (LAB)',
        description: 'Extrae la textura (L) separada del color y ajusta su nitidez.',
        category: 'CHANNELS',
        params: [
            { id: 'l_contrast', label: 'Contraste L', type: 'slider', min: 1, max: 3, step: 0.1, default: 1.5 }
        ]
    },
    {
        id: 'COLOR_INVERSION',
        name: 'Inversión Negativa Base',
        description: 'Inversión fotográfica para detectar variaciones oscuras de pátina.',
        category: 'CHANNELS',
        params: [] // No params needed
    },

    // --- TEXTURE & EDGES ---
    {
        id: 'HIGH_PASS',
        name: 'Filtro de Paso Alto (Bordes)',
        description: 'Elimina gradientes suaves, dejando sólo los bordes finos. Perfecto para petroglifos grabados.',
        category: 'EDGES',
        params: [
            { id: 'radius', label: 'Radio de Detección', type: 'slider', min: 1, max: 10, step: 1, default: 3 },
            { id: 'strength', label: 'Fuerza', type: 'slider', min: 1, max: 50, step: 1, default: 10 }
        ]
    },
    {
        id: 'UNSHARP_MASK',
        name: 'Máscara de Enfoque',
        description: 'Mejora increíblemente la nitidez aparente de los surcos y líneas pintadas.',
        category: 'EDGES',
        params: [
            { id: 'amount', label: 'Cantidad', type: 'slider', min: 0, max: 500, step: 10, default: 150 },
            { id: 'radius', label: 'Radio', type: 'slider', min: 1, max: 20, step: 1, default: 2 }
        ]
    },
    {
        id: 'EMBOSS',
        name: 'Simulador de Relieve (Emboss)',
        description: 'Genera un efecto 3D falso usando direccionalidad de sombras.',
        category: 'EDGES',
        params: [
            { id: 'depth', label: 'Profundidad', type: 'slider', min: 1, max: 10, step: 1, default: 3 }
        ]
    },

    // --- EXPERIMENTAL ---
    {
        id: 'POSTERIZE',
        name: 'Filtro Posterizado (K-Means ligero)',
        description: 'Reduce el conteo de colores para agrupar pigmentos similares. Segmentación básica.',
        category: 'EXPERIMENTAL',
        params: [
            { id: 'levels', label: 'Niveles de Color', type: 'slider', min: 2, max: 16, step: 1, default: 4 }
        ]
    }
];
