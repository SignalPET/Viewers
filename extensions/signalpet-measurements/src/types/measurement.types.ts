/**
 * Source information for a measurement
 */
export interface MeasurementSource {
  uid: string;
  name: string;
  version: string;
}

/**
 * Comprehensive measurement type based on OHIF MeasurementService schema
 */
export interface Measurement {
  // Core identifiers
  uid: string;
  SOPInstanceUID?: string;
  FrameOfReferenceUID?: string;
  referenceStudyUID?: string;
  referenceSeriesUID?: string;
  frameNumber?: number;
  displaySetInstanceUID?: string;

  // Measurement properties
  label?: string;
  description?: string;
  type?: string;
  unit?: string;
  toolName?: string;

  // Visual properties
  color?: number[];
  isLocked?: boolean;
  isVisible?: boolean;
  isSelected?: boolean;

  // Geometric data
  points?: any[];

  // Statistical values
  area?: number;
  mean?: number;
  stdDev?: number;
  perimeter?: number;
  length?: number;
  shortestDiameter?: number;
  longestDiameter?: number;
  cachedStats?: any;

  // Source and metadata
  source?: MeasurementSource;
  metadata?: any;
  data?: any;

  // Text and display
  displayText?: MeasurementDisplayText;
  textBox?: any;

  // State tracking
  isDirty?: boolean;
  modifiedTimestamp?: number;

  // Image reference
  referencedImageId?: string;

  // Report generation
  getReport?: () => any;

  // Additional fields
  sequenceNumber?: number;
  rawData?: any;
}

/**
 * Filter function type for measurements
 */
export type MeasurementFilter = (measurement: Measurement) => boolean;

export type MeasurementDisplayText = {
  primary?: string[];
  secondary?: string[];
};
