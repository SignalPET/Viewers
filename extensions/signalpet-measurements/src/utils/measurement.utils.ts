import type { Measurement } from '../types';
import { backOff } from 'exponential-backoff';

/**
 * Expected fields for each tool type based on measurement service mappings
 */
const EXPECTED_FIELDS_BY_TOOL: Record<string, string[]> = {
  Length: ['length', 'unit'],
  PlanarFreehandROI: ['mean', 'stdDev', 'max', 'area', 'areaUnit', 'modalityUnit'],
  Probe: ['value'],
  CircleROI: [
    'mean',
    'stdDev',
    'max',
    'area',
    'areaUnit',
    'modalityUnit',
    'perimeter',
    'radiusUnit',
  ],
  RectangleROI: ['mean', 'stdDev', 'max', 'area', 'areaUnit', 'modalityUnit'],
  EllipticalROI: ['mean', 'stdDev', 'max', 'area', 'areaUnit', 'modalityUnit'],
};

/**
 * Check if cached stats object has all required fields for the tool type
 */
const hasAllRequiredFields = (cachedStats: any, toolName: string): boolean => {
  const expectedFields = EXPECTED_FIELDS_BY_TOOL[toolName];
  if (!expectedFields) {
    // If tool type is unknown, just check that it's not empty
    return Object.keys(cachedStats).length > 0;
  }

  // Check that all expected fields exist and are not undefined
  return expectedFields.every(field => cachedStats.hasOwnProperty(field));
};

/**
 * Utility functions for measurement operations
 */

/**
 * Validates if measurements exist and are not empty
 */
export const validateMeasurements = (measurements: Measurement[]): boolean => {
  return measurements && measurements.length > 0;
};

/**
 * Shows notification for measurement-related operations
 */
export const showMeasurementNotification = (
  uiNotificationService: any,
  type: 'success' | 'error' | 'warning',
  title: string,
  message: string,
  duration: number = 4000
) => {
  uiNotificationService.show({
    title,
    message,
    type,
    duration,
  });
};

/**
 * Gets measurements for a specific display set
 */
export const getMeasurementsForDisplaySet = (
  measurementService: any,
  displaySetInstanceUID: string
): Measurement[] => {
  const allMeasurements = measurementService.getMeasurements();
  return allMeasurements.filter(
    (measurement: Measurement) =>
      measurement.displaySetInstanceUID === displaySetInstanceUID ||
      measurement.referencedImageId?.includes(displaySetInstanceUID)
  );
};

/**
 * Pure save function - saves measurements for a specific image
 * Note: signalpetSaveSR command handles filtering measurements by imageDisplaySetInstanceUID
 */
export const saveSRForImage = async (
  commandsManager: any,
  displaySetInstanceUID: string
): Promise<void> => {
  if (!displaySetInstanceUID) {
    throw new Error('No displaySetInstanceUID provided');
  }

  // signalpetSaveSR command handles the filtering and validation
  await commandsManager.runCommand('signalpetSaveSR', {
    imageDisplaySetInstanceUID: displaySetInstanceUID,
  });
};

/**
 * Determines if a measurement action should mark measurements as unsaved
 */
export const shouldMarkAsUnsaved = (command: string): boolean => {
  const unsavedCommands = ['updateMeasurementLabel', 'removeMeasurement'];
  return unsavedCommands.includes(command);
};

/**
 * Gets the current active display set UID from the viewport grid service
 */
export const getCurrentDisplaySetUID = (servicesManager: any): string | undefined => {
  const { viewportGridService } = servicesManager.services;
  const activeViewportId = viewportGridService.getActiveViewportId();
  return viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];
};

export const getMeasurementCachedStats = async (
  measurement: Measurement
): Promise<Record<string, any>> => {
  // Function to attempt getting annotation data
  const getAnnotationData = async (): Promise<Record<string, any>> => {
    const annotation = (window as any).cornerstoneTools?.annotation?.state?.getAnnotation(
      measurement.uid
    );

    if (annotation?.data?.cachedStats) {
      const cachedStats = Object.values(annotation.data.cachedStats)[0];
      if (cachedStats && typeof cachedStats === 'object' && Object.keys(cachedStats).length > 0) {
        if (hasAllRequiredFields(cachedStats, measurement.toolName)) {
          return cachedStats;
        }
      }
    }

    throw new Error('Cached stats not available yet');
  };

  try {
    // Use exponential-backoff library with configuration matching our previous implementation
    const cachedStats = await backOff(getAnnotationData, {
      numOfAttempts: 5,
      startingDelay: 50,
      timeMultiple: 2,
      maxDelay: 1000,
      retry: (error, attemptNumber) => {
        console.log(
          `[getMeasurementCachedStats] Attempt ${attemptNumber} failed for measurement ${measurement.uid}:`,
          error.message
        );
        return true; // Continue retrying
      },
    });

    return cachedStats;
  } catch (error) {
    console.warn(
      '[getMeasurementCachedStats] All retry attempts failed for measurement:',
      measurement.uid
    );

    return {};
  }
};
