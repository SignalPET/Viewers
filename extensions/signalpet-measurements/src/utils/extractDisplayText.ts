import type { Measurement } from '../types';
import { measurementMappingUtils } from '@ohif/extension-cornerstone';
import { utils } from '@ohif/core';
import { roundNumber } from '@ohif/core/src/utils';

// Import OHIF utility functions for consistent formatting
const getDisplayUnit = (unit: string | undefined) => (unit == null ? '' : unit);

const getStatisticDisplayString = (
  numbers: number | number[],
  unit: string | undefined,
  key: string
): string => {
  if (Array.isArray(numbers) && numbers.length > 0) {
    const results = numbers.map(number => utils.roundNumber(number, 2));
    return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${results.join(', ')} ${getDisplayUnit(unit)}`;
  }

  const result = utils.roundNumber(numbers as number, 2);
  return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${result} ${getDisplayUnit(unit)}`;
};

export interface DisplayText {
  primary?: string[];
  secondary?: string[];
}

/**
 * Extract display text that replicates Cornerstone's textbox overlay formatting
 *
 * This function replicates the exact logic Cornerstone uses to generate textbox content
 * from cachedStats, providing the same text that appears in the overlay annotations.
 *
 * Priority order for stats:
 * 1. source.getAnnotation() - official measurement service method
 * 2. measurement.data.cachedStats - embedded cached statistics
 * 3. window.cornerstoneTools - fallback for direct tool access
 * 4. measurement properties - direct statistical values
 */
/**
 * Extract the formatted textbox content that replicates Cornerstone's display
 * @param measurement - The measurement containing source and metadata
 * @returns Array of formatted text lines exactly as they appear in Cornerstone textbox
 */
export function extractTextboxContent(measurement: Measurement): string[] {
  const stats = extractStatsFromAnnotation(measurement);
  const toolName = measurement.toolName?.toLowerCase();

  if (!stats) {
    return [];
  }

  return formatStatsLikeCornerstoneTextbox(stats, toolName);
}

export function extractDisplayText(measurement: Measurement): DisplayText {
  // Generate display text using Cornerstone's own formatting logic from cachedStats
  const stats = extractStatsFromAnnotation(measurement);
  const toolName = measurement.toolName?.toLowerCase();

  const displayText: DisplayText = {
    primary: [],
    secondary: [],
  };

  if (!stats) {
    return displayText;
  }

  // Use Cornerstone's formatting logic to replicate textbox content
  const formattedLines = formatStatsLikeCornerstoneTextbox(stats, toolName);

  if (formattedLines.length > 0) {
    displayText.primary = formattedLines;
    return displayText;
  }

  // Fallback: Format different stats based on tool type patterns from OHIF
  const { area, max, mean, perimeter, areaUnit, modalityUnit, radiusUnit } = stats;

  // Area-based tools (CircleROI, EllipticalROI, RectangleROI, PlanarFreehandROI)
  if (area !== undefined && !isNaN(area)) {
    const roundedArea = roundNumber(area, 2);
    const unit = getDisplayUnit(areaUnit);
    displayText.primary.push(`${roundedArea} ${unit}`);
  }

  // Show max value for area-based tools
  if (max !== undefined && !isNaN(max)) {
    const maxStr = getStatisticDisplayString(max, modalityUnit, 'max');
    displayText.primary.push(maxStr);
  }

  // Show perimeter for circle tools (CircleROI)
  if (perimeter !== undefined && !isNaN(perimeter) && toolName?.includes('circle')) {
    const perimeterStr = getStatisticDisplayString(perimeter, radiusUnit, 'perimeter');
    displayText.primary.push(perimeterStr);
  }

  // Show mean for region tools when max is not available
  if (mean !== undefined && !isNaN(mean) && (max === undefined || isNaN(max))) {
    const meanStr = getStatisticDisplayString(mean, modalityUnit, 'mean');
    displayText.primary.push(meanStr);
  }

  return displayText;
}

/**
 * Format statistics exactly like Cornerstone's textbox overlays
 * This replicates the logic Cornerstone uses to generate textbox content from cachedStats
 * @param stats - The statistics object from cachedStats
 * @param toolName - The tool name for tool-specific formatting
 * @returns Array of formatted text lines exactly as they appear in Cornerstone textbox
 */
function formatStatsLikeCornerstoneTextbox(
  stats: Record<string, any>,
  toolName?: string
): string[] {
  const lines: string[] = [];

  // Priority order matching Cornerstone's textbox display:
  // 1. Area (for ROI tools)
  // 2. Max value
  // 3. Mean value
  // 4. Standard deviation
  // 5. Perimeter (for some tools)

  // Format area (highest priority for ROI tools)
  if (stats.area !== undefined && !isNaN(stats.area)) {
    const area = roundNumber(stats.area, 2);
    const unit = getDisplayUnit(stats.areaUnit);
    lines.push(`${area} ${unit}`);
  }

  // Format max value
  if (stats.max !== undefined && !isNaN(stats.max)) {
    const max = roundNumber(stats.max, 2);
    const unit = getDisplayUnit(stats.modalityUnit || stats.unit);
    lines.push(`Max: ${max} ${unit}`);
  }

  // Format mean value
  if (stats.mean !== undefined && !isNaN(stats.mean)) {
    const mean = roundNumber(stats.mean, 2);
    const unit = getDisplayUnit(stats.modalityUnit || stats.unit);
    lines.push(`Mean: ${mean} ${unit}`);
  }

  // Format standard deviation
  if (stats.stdDev !== undefined && !isNaN(stats.stdDev)) {
    const stdDev = roundNumber(stats.stdDev, 2);
    const unit = getDisplayUnit(stats.modalityUnit || stats.unit);
    lines.push(`Std Dev: ${stdDev} ${unit}`);
  }

  // Format perimeter (for applicable tools)
  if (stats.perimeter !== undefined && !isNaN(stats.perimeter)) {
    const perimeter = roundNumber(stats.perimeter, 2);
    const unit = getDisplayUnit(stats.perimeterUnit || stats.radiusUnit);
    lines.push(`Perimeter: ${perimeter} ${unit}`);
  }

  // Format length (for Length tool)
  if (stats.length !== undefined && !isNaN(stats.length)) {
    const length = roundNumber(stats.length, 2);
    const unit = getDisplayUnit(stats.lengthUnit || stats.unit);
    lines.push(`${length} ${unit}`);
  }

  return lines;
}

/**
 * Extract stats from annotation using both source.getAnnotation and fallback methods
 * @param measurement - The measurement containing source and metadata
 * @returns Stats from annotation data.cachedStats or measurement data
 */
function extractStatsFromAnnotation(measurement: Measurement): Record<string, any> | null {
  try {
    // Method 1: Use source.getAnnotation if available
    if (measurement.source && 'getAnnotation' in measurement.source && measurement.toolName) {
      const annotation = (measurement.source as any).getAnnotation(
        measurement.toolName,
        measurement.uid
      );

      // BONUS: If annotation has direct text field (exactly what shows in textbox overlay)
      if (annotation?.data?.text) {
        console.log(`[SignalPET] Found annotation.data.text: "${annotation.data.text}"`);
        // This text is exactly what appears in the Cornerstone textbox overlay!
        // You can use this directly if you want the exact same formatting
      }

      if (annotation?.data?.cachedStats) {
        const cachedStats = annotation.data.cachedStats;

        // Return the first available stats (similar to existing logic)
        for (const [key, value] of Object.entries(cachedStats)) {
          if (key.includes('imageId:') || key.includes('wadors:') || key.includes('http')) {
            return value as Record<string, any>;
          }
        }
      }
    }

    // Method 2: Use measurement.data if available
    if (measurement.data) {
      // Check if measurement.data contains cachedStats directly
      if (measurement.data.cachedStats) {
        for (const [key, value] of Object.entries(measurement.data.cachedStats)) {
          if (key.includes('imageId:') || key.includes('wadors:') || key.includes('http')) {
            return value as Record<string, any>;
          }
        }
      }

      // Or if measurement.data itself contains the stats
      if (measurement.data.area !== undefined || measurement.data.max !== undefined) {
        return measurement.data;
      }
    }

    // Method 3: Fallback to window.cornerstoneTools (original approach)
    const cornerstoneTools = (window as any).cornerstoneTools;
    if (cornerstoneTools?.annotation?.state) {
      const textBoxAnnotation = cornerstoneTools.annotation.state.getAnnotation(measurement.uid);

      // BONUS: Check for direct text field here too
      if (textBoxAnnotation?.data?.text) {
        console.log(
          `[SignalPET] Found textBox annotation.data.text: "${textBoxAnnotation.data.text}"`
        );
        // This is exactly what appears in the Cornerstone textbox overlay!
      }

      if (textBoxAnnotation?.data?.cachedStats) {
        const cachedStats = textBoxAnnotation.data.cachedStats;

        for (const [key, value] of Object.entries(cachedStats)) {
          if (key.includes('imageId:') || key.includes('wadors:') || key.includes('http')) {
            return value as Record<string, any>;
          }
        }
      }
    }

    // Method 4: Use measurement's own statistical properties as fallback
    const directStats: Record<string, any> = {};
    if (measurement.area !== undefined) directStats.area = measurement.area;
    if (measurement.mean !== undefined) directStats.mean = measurement.mean;
    if (measurement.perimeter !== undefined) directStats.perimeter = measurement.perimeter;
    if (measurement.cachedStats) {
      Object.assign(directStats, measurement.cachedStats);
    }

    if (Object.keys(directStats).length > 0) {
      return directStats;
    }

    return null;
  } catch (error) {
    console.error(`[SignalPET] Error extracting stats from annotation ${measurement.uid}:`, error);
    return null;
  }
}
