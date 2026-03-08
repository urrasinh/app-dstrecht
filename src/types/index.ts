export interface ExifData {
    latDD: number | null;
    lonDD: number | null;
    make: string;
    model: string;
    date: string;
    origW: number;
    origH: number;
}

export type DStretchModeType = 'NONE' | 'LAB' | 'LAB_MOD1' | 'LAB_MOD2' | 'MATRIX';

export interface DStretchModeConfig {
    desc: string;
    type: DStretchModeType;
    mat?: number[][];
}

export type VisualFilterType = 'Normal' | 'Negativo' | 'Cian' | 'HDR' | 'Ultra' | 'Grises' | 'Saturado';

// Worker Messages
export type WorkerRequestMessageType = 'INIT_PROCESS' | 'CROP' | 'ROTATE_90';

export interface WorkerInitRequest {
    type: 'INIT_PROCESS';
    imageData: ImageData; // Or we can pass an array buffer later
    scaleDown: boolean;
}

export interface WorkerCropRequest {
    type: 'CROP';
    cropData: ImageData;
}

export interface WorkerRotateRequest {
    type: 'ROTATE_90';
}

export type WorkerRequest = WorkerInitRequest | WorkerCropRequest | WorkerRotateRequest;

export type WorkerStatusMessageType = 'PROGRESS' | 'SUCCESS' | 'ERROR';

export interface WorkerProgressMessage {
    type: 'PROGRESS';
    progress: number;
    message: string;
}

export interface WorkerSuccessMessage {
    type: 'SUCCESS';
    processedImages: {
        modeName: string;
        imageData: ImageData;
    }[];
    baseImageData: ImageData; // Contains the resized or original image
    width: number;
    height: number;
}

export interface WorkerErrorMessage {
    type: 'ERROR';
    error: string;
}

export interface WorkerAdvancedPreviewsSuccessMessage {
    type: 'ADVANCED_PREVIEWS_SUCCESS';
    previews: { filterId: string; imageData: ImageData }[];
}

export type WorkerResponse = WorkerProgressMessage | WorkerSuccessMessage | WorkerErrorMessage | WorkerAdvancedPreviewsSuccessMessage;

// --- Advanced Filters Configuration ---
export type AdvancedFilterCategory = 'GLOBAL' | 'CHANNELS' | 'EDGES' | 'EXPERIMENTAL';

export interface AdvancedFilterDef {
    id: string;
    name: string;
    description: string;
    category: AdvancedFilterCategory;
    params: {
        id: string;
        label: string;
        type: 'slider';
        min: number;
        max: number;
        step: number;
        default: number;
    }[];
}

export interface AdvancedFilterParams {
    filterId: string;
    values: Record<string, number>;
}

export interface WorkerAdvancedFilterRequest {
    type: 'PROCESS_ADVANCED_FILTER';
    imageData: ImageData;
    filterId: string;
    params: Record<string, number>;
}

export interface WorkerGenerateAdvancedPreviewsRequest {
    type: 'GENERATE_ADVANCED_PREVIEWS';
    previewImageData: ImageData;
}

export type ExtendedWorkerRequest = WorkerRequest | WorkerAdvancedFilterRequest | WorkerGenerateAdvancedPreviewsRequest;

// Re-export so old references don't break, but ideally union them in the main worker usage
