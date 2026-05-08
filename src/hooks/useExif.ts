import { useState, useCallback } from 'react';
import exifr from 'exifr';
import type { ExifData } from '../types';

export function useExif() {
    const [exifData, setExifData] = useState<ExifData>({
        latDD: null,
        lonDD: null,
        make: '',
        model: '',
        date: '',
        origW: 0,
        origH: 0
    });

    const extractExif = useCallback(async (file: File): Promise<{ orientation: number; data: ExifData }> => {
        try {
            const gpsData = await exifr.gps(file);
            const exif = await exifr.parse(file, ['Orientation', 'Make', 'Model', 'DateTimeOriginal']);

            const orientation = exif?.Orientation || 1;
            const make = exif?.Make || 'Desconocido';
            const model = exif?.Model || '';
            const date = exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toLocaleString() : 'Fecha no registrada';

            let latDD = null;
            let lonDD = null;

            if (gpsData) {
                latDD = gpsData.latitude;
                lonDD = gpsData.longitude;
            }

            const data: ExifData = { make, model, date, latDD, lonDD, origW: 0, origH: 0 };
            setExifData(prev => ({ ...prev, ...data }));

            return { orientation, data };
        } catch (error) {
            console.error('Error extracting EXIF data:', error);
            return { orientation: 1, data: { make: 'Desconocido', model: '', date: '', latDD: null, lonDD: null, origW: 0, origH: 0 } };
        }
    }, []);

    const setOriginalDimensions = useCallback((w: number, h: number) => {
        setExifData(prev => ({ ...prev, origW: w, origH: h }));
    }, []);

    return { exifData, extractExif, setOriginalDimensions };
}
