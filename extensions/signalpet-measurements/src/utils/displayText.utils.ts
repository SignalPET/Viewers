import { Measurement, MeasurementDisplayText } from '../types';
import { getMeasurementCachedStats } from './measurement.utils';

export const getRealDisplayText = (measurement: Measurement): MeasurementDisplayText => {
  const cachedStats = getMeasurementCachedStats(measurement);
  const toolName = measurement.toolName;
  switch (toolName) {
    case 'Length':
      return {
        primary: [`${cachedStats.length?.toFixed(2)} ${cachedStats.unit}`],
      };
    case 'PlanarFreehandROI':
      return {
        primary: [`${cachedStats.length?.toFixed(2)} ${cachedStats.unit}`],
      };
    case 'Probe':
      return {
        primary: [`${cachedStats.index?.join(', ') || 'N/A'}`],
        secondary: [`${cachedStats.value} ${cachedStats.modalityUnit || ''}`],
      };
    case 'CircleROI':
      return {
        primary: [`${cachedStats.area?.toFixed(2) || 'N/A'} ${cachedStats.areaUnit || ''}`],
        secondary: [
          `Mean: ${cachedStats.mean?.toFixed(2) || 'N/A'} ${cachedStats.modalityUnit || ''}`,
        ],
      };
    case 'RectangleROI':
      return {
        primary: [`${cachedStats.area?.toFixed(2) || 'N/A'} ${cachedStats.areaUnit || ''}`],
        secondary: [
          `Mean: ${cachedStats.mean?.toFixed(2) || 'N/A'} ${cachedStats.modalityUnit || ''}`,
        ],
      };
    case 'EllipticalROI':
      return {
        primary: [`${cachedStats.area?.toFixed(2) || 'N/A'} ${cachedStats.areaUnit || ''}`],
        secondary: [
          `Mean: ${cachedStats.mean?.toFixed(2) || 'N/A'} ${cachedStats.modalityUnit || ''}`,
        ],
      };
    default:
      return {
        primary: ['No annotation data'],
      };
  }
};
