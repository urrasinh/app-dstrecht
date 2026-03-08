import { useState, useCallback } from 'react';
import EXIF from 'exif-js';
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

    const convertDMSToDD = (degrees: number, minutes: number, seconds: number, direction: string) => {
        let dd = degrees + minutes / 60 + seconds / (60 * 60);
        if (direction === "S" || direction === "W") dd = dd * -1;
        return dd;
    };

    const extractExif = useCallback((file: File): Promise<number> => {
        return new Promise((resolve) => {
            // @ts-ignore EXIF is not fully typed
            EXIF.getData(file as any, function (this: any) {
                // @ts-ignore
                const orientation = EXIF.getTag(this, "Orientation") || 1;
                // @ts-ignore
                const make = EXIF.getTag(this, "Make") || 'Desconocido';
                // @ts-ignore
                const model = EXIF.getTag(this, "Model") || '';
                // @ts-ignore
                const date = EXIF.getTag(this, "DateTimeOriginal") || 'Fecha no registrada';

                // @ts-ignore
                const lat = EXIF.getTag(this, "GPSLatitude");
                // @ts-ignore
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                // @ts-ignore
                const lon = EXIF.getTag(this, "GPSLongitude");
                // @ts-ignore
                const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

                let latDD = null;
                let lonDD = null;

                if (lat && lon && latRef && lonRef) {
                    latDD = convertDMSToDD(lat[0], lat[1], lat[2], latRef);
                    lonDD = convertDMSToDD(lon[0], lon[1], lon[2], lonRef);
                }

                setExifData(prev => ({
                    ...prev,
                    make,
                    model,
                    date,
                    latDD,
                    lonDD
                }));

                resolve(orientation);
            });
        });
    }, []);

    const setOriginalDimensions = useCallback((w: number, h: number) => {
        setExifData(prev => ({ ...prev, origW: w, origH: h }));
    }, []);

    return { exifData, extractExif, setOriginalDimensions };
}
