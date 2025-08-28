import { Measurement, MeasurementDisplayText } from '../types';
import { getMeasurementCachedStats } from './measurement.utils';

// Helper function to safely format numeric values that might be strings
const formatNumber = (value: any, decimals: number = 2): string => {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 'N/A' : num.toFixed(decimals);
};

export const getRealDisplayText = async (
  measurement: Measurement
): Promise<MeasurementDisplayText> => {
  const cachedStats = await getMeasurementCachedStats(measurement);
  const toolName = measurement.toolName;
  switch (toolName) {
    case 'Length':
      return {
        primary: [`${formatNumber(cachedStats?.length)} ${cachedStats?.unit || ''}`],
      };
    case 'PlanarFreehandROI':
      return {
        primary: [`${formatNumber(cachedStats?.length)} ${cachedStats?.unit || ''}`],
      };
    case 'Probe':
      return {
        primary: [`${cachedStats?.index?.join(', ') || 'N/A'}`],
        secondary: [`${formatNumber(cachedStats?.value)} ${cachedStats?.modalityUnit || ''}`],
      };
    case 'CircleROI':
      return {
        primary: [`${formatNumber(cachedStats?.area)} ${cachedStats?.areaUnit || ''}`],
        secondary: [`Mean: ${formatNumber(cachedStats?.mean)} ${cachedStats?.modalityUnit || ''}`],
      };
    case 'RectangleROI':
      return {
        primary: [`${formatNumber(cachedStats?.area)} ${cachedStats?.areaUnit || ''}`],
        secondary: [`Mean: ${formatNumber(cachedStats?.mean)} ${cachedStats?.modalityUnit || ''}`],
      };
    case 'EllipticalROI':
      return {
        primary: [`${formatNumber(cachedStats?.area)} ${cachedStats?.areaUnit || ''}`],
        secondary: [`Mean: ${formatNumber(cachedStats?.mean)} ${cachedStats?.modalityUnit || ''}`],
      };
    default:
      return {
        primary: ['No annotation data'],
      };
  }
};
