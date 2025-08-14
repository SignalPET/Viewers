import type { Measurement } from '../types';

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
 * Handles save measurements operation with proper error handling and notifications
 */
export const saveMeasurementsWithNotification = async (
  measurementService: any,
  commandsManager: any,
  uiNotificationService: any,
  displaySetInstanceUID: string
): Promise<void> => {
  const currentMeasurements = measurementService.getMeasurements();

  if (!validateMeasurements(currentMeasurements)) {
    showMeasurementNotification(
      uiNotificationService,
      'warning',
      'No Measurements',
      'No measurements to save. Please create some measurements first.'
    );
    return;
  }

  if (!displaySetInstanceUID) {
    showMeasurementNotification(
      uiNotificationService,
      'error',
      'Save Failed',
      'No active viewport found'
    );
    return;
  }

  try {
    // Use the proper SignalPET save command with current image display set UID
    await commandsManager.runCommand('signalpetSaveSR', {
      imageDisplaySetInstanceUID: displaySetInstanceUID,
    });

    // Show success message
    showMeasurementNotification(
      uiNotificationService,
      'success',
      'SR Saved Successfully',
      `Successfully saved ${currentMeasurements.length} measurements`
    );
  } catch (error) {
    console.error('[Measurement Utils] Failed to save SR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showMeasurementNotification(
      uiNotificationService,
      'error',
      'Save Failed',
      `Failed to save measurements as SR: ${errorMessage}`,
      5000
    );
    throw error;
  }
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

export const getMeasurementCachedStats = (measurement: Measurement): Record<string, any> => {
  const annotation = window.cornerstoneTools.annotation.state.getAnnotation(measurement.uid);
  return Object.values(annotation?.data?.cachedStats || {})[0] || {};
};
