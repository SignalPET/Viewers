import type { Measurement } from '../types';

export interface DisplayText {
  primary?: string;
  secondary?: string;
}

/**
 * Clean, simple function to extract display text from measurements
 */
export function extractDisplayText(measurement: Measurement): DisplayText {
  // Get the stats data from the nested structure
  const stats = extractStatsFromMeasurement(measurement);

  const toolName = measurement.toolName?.toLowerCase();

  switch (toolName) {
    case 'length':
      return extractLengthText(stats);

    case 'circleroi':
    case 'ellipticalroi':
    case 'rectangleroi':
      return extractAreaText(stats);

    case 'planarfreehandroi':
      return extractFreehandText(stats);

    case 'arrowannotate':
      return extractArrowText(measurement);

    case 'bidirectional':
      return extractBidirectionalText(stats);

    case 'angle':
    case 'cobb':
      return extractAngleText(stats);

    case 'probe':
      return extractProbeText(stats, measurement);

    default:
      return extractGenericText(stats, measurement);
  }
}

/**
 * Extract stats from the nested measurement data structure
 */
function extractStatsFromMeasurement(measurement: Measurement): Record<string, any> | null {
  if (!measurement.data) return null;

  // Find the nested stats data under imageId keys
  for (const [key, value] of Object.entries(measurement.data)) {
    if (key.includes('imageId:') || key.includes('wadors:') || key.includes('http')) {
      if (value && typeof value === 'object' && hasStatsData(value)) {
        return value as Record<string, any>;
      }
    }
  }

  // Fallback to direct data if it has stats
  if (hasStatsData(measurement.data)) {
    return measurement.data;
  }

  return null;
}

/**
 * Check if an object contains statistical data
 */
function hasStatsData(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  const statsKeys = ['area', 'mean', 'length', 'volume', 'max', 'min', 'stdDev'];
  return statsKeys.some(key => obj[key] !== undefined);
}

/**
 * Extract display text for length measurements
 */
function extractLengthText(stats: Record<string, any> | null): DisplayText {
  if (!stats) return { primary: 'Length' };

  const length = parseNumericValue(stats.length);
  const unit = stats.unit || 'mm';

  if (length !== null) {
    return { primary: `${formatNumber(length)} ${unit}` };
  }

  return { primary: 'Length' };
}

/**
 * Extract display text for area measurements (Circle, Rectangle, Ellipse ROI)
 */
function extractAreaText(stats: Record<string, any> | null): DisplayText {
  if (!stats) return { primary: 'Area' };

  const area = parseNumericValue(stats.area);
  const mean = parseNumericValue(stats.mean);
  const areaUnit = stats.areaUnit || 'mm²';
  const modalityUnit = stats.modalityUnit || 'HU';

  let primary: string | undefined;
  let secondary: string | undefined;

  if (area !== null) {
    primary = `${formatNumber(area)} ${areaUnit}`;
  }

  if (mean !== null) {
    secondary = `Mean: ${formatNumber(mean)} ${modalityUnit}`;
  }

  return {
    primary: primary || 'Area',
    secondary,
  };
}

/**
 * Extract display text for freehand ROI measurements
 */
function extractFreehandText(stats: Record<string, any> | null): DisplayText {
  if (!stats) return { primary: 'Freehand' };

  const length = parseNumericValue(stats.length);
  const unit = stats.unit || 'mm';

  if (length !== null) {
    return { primary: `${formatNumber(length)} ${unit}` };
  }

  return { primary: 'Freehand' };
}

/**
 * Extract display text for arrow annotations
 */
function extractArrowText(measurement: Measurement): DisplayText {
  if (measurement.label && measurement.label.trim().length > 0) {
    return { primary: measurement.label.trim() };
  }

  return { primary: 'Arrow' };
}

/**
 * Extract display text for probe measurements
 */
function extractProbeText(
  stats: Record<string, any> | null,
  measurement: Measurement
): DisplayText {
  // For probe, try to get coordinates if no stats available
  if (measurement.points && measurement.points.length >= 1) {
    const point = measurement.points[0];
    return {
      primary: `(${formatNumber(point[0])}, ${formatNumber(point[1])})`,
    };
  }

  return { primary: 'Probe' };
}

/**
 * Extract display text for bidirectional measurements
 */
function extractBidirectionalText(stats: Record<string, any> | null): DisplayText {
  if (!stats) return { primary: 'Bidirectional' };

  const length = parseNumericValue(stats.length);
  const width = parseNumericValue(stats.width);

  let primary: string | undefined;
  let secondary: string | undefined;

  if (length !== null) {
    primary = `${formatNumber(length)} mm`;
  }

  if (width !== null) {
    secondary = `Short: ${formatNumber(width)} mm`;
  }

  return {
    primary: primary || 'Bidirectional',
    secondary,
  };
}

/**
 * Extract display text for angle measurements
 */
function extractAngleText(stats: Record<string, any> | null): DisplayText {
  if (!stats) return { primary: 'Angle' };

  const angle = parseNumericValue(stats.angle);

  if (angle !== null) {
    return { primary: `${formatNumber(angle)}°` };
  }

  return { primary: 'Angle' };
}

/**
 * Extract display text for unknown measurement types
 */
function extractGenericText(
  stats: Record<string, any> | null,
  measurement: Measurement
): DisplayText {
  if (!stats) {
    return extractFallbackText(measurement);
  }

  // Try common statistical values in order of preference
  const statOrder = ['area', 'length', 'volume', 'mean', 'max', 'min', 'stdDev'];

  for (const statName of statOrder) {
    const value = parseNumericValue(stats[statName]);
    if (value !== null) {
      const unit = getUnitForStat(statName, stats);
      return { primary: `${formatNumber(value)} ${unit}`.trim() };
    }
  }

  return extractFallbackText(measurement);
}

/**
 * Parse a numeric value from various formats (string, number, object with .value)
 */
function parseNumericValue(value: any): number | null {
  if (value === undefined || value === null) return null;

  // Handle string values
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  // Handle numeric values
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  // Handle object with .value property
  if (typeof value === 'object' && value.value !== undefined) {
    return parseNumericValue(value.value);
  }

  return null;
}

/**
 * Get appropriate unit for a statistic type
 */
function getUnitForStat(statName: string, stats?: Record<string, any>): string {
  // Try to get unit from stats first
  if (stats) {
    if (statName === 'area' && stats.areaUnit) return stats.areaUnit;
    if (statName === 'length' && stats.unit) return stats.unit;
    if (['mean', 'max', 'min', 'stdDev'].includes(statName) && stats.modalityUnit) {
      return stats.modalityUnit;
    }
  }

  // Fallback to default units
  switch (statName) {
    case 'area':
      return 'mm²';
    case 'length':
      return 'mm';
    case 'volume':
      return 'mm³';
    case 'mean':
    case 'max':
    case 'min':
    case 'stdDev':
      return 'HU';
    default:
      return '';
  }
}

/**
 * Format numbers for display (remove unnecessary decimals)
 */
function formatNumber(value: number): string {
  if (!isFinite(value)) return '0';

  // Round to 2 decimal places and remove trailing zeros
  const rounded = Math.round(value * 100) / 100;
  return rounded.toString();
}

/**
 * Fallback text when no stats data is available
 */
function extractFallbackText(measurement: Measurement): DisplayText {
  if (measurement.label) {
    return { primary: measurement.label };
  }

  if (measurement.toolName) {
    return { primary: measurement.toolName };
  }

  return { primary: 'Measurement' };
}

/**
 * Helper to get the primary display value as a string
 */
export function getPrimaryDisplayValue(measurement: Measurement): string | undefined {
  const displayText = extractDisplayText(measurement);
  return displayText.primary;
}

/**
 * Helper to get the secondary display value as a string
 */
export function getSecondaryDisplayValue(measurement: Measurement): string | undefined {
  const displayText = extractDisplayText(measurement);
  return displayText.secondary;
}
