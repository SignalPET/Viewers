import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Measurement, SRVersion } from '../types';
import { getMeasurementsForDisplaySet, getDirtyDisplaySetUIDs } from '../utils/measurement.utils';

/**
 * Unified measurements panel hook - handles single and multi-image layouts seamlessly
 */

export interface ImageData {
  displaySetInstanceUID: string;
  displaySetDescription: string;
  displaySetLabel: string;
  measurements: Measurement[];
  srVersions: SRVersion[];
  selectedSR: SRVersion | null;
  loading: boolean;
}

interface UseMeasurementsPanelOptions {
  servicesManager: any;
  commandsManager: any;
}

export const useMeasurementsPanel = ({
  servicesManager,
  commandsManager,
}: UseMeasurementsPanelOptions) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);
  const [displaySetsWithDeletions, setDisplaySetsWithDeletions] = useState<Set<string>>(new Set());

  const { viewportGridService, displaySetService, measurementService } = servicesManager.services;

  // Get all currently displayed images
  const getCurrentlyDisplayedImages = useCallback(() => {
    const state = viewportGridService.getState();
    const imageData: Array<{
      displaySetInstanceUID: string;
      displaySet: any;
    }> = [];

    // Collect all displayed images (state.viewports is a Map)
    state.viewports.forEach((viewport: any) => {
      if (viewport.displaySetInstanceUIDs?.length > 0) {
        viewport.displaySetInstanceUIDs.forEach((displaySetInstanceUID: string) => {
          // Avoid duplicates
          if (!imageData.find(img => img.displaySetInstanceUID === displaySetInstanceUID)) {
            const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
            if (displaySet) {
              imageData.push({
                displaySetInstanceUID,
                displaySet,
              });
            }
          }
        });
      }
    });

    return imageData;
  }, [viewportGridService, displaySetService]);

  // Get SR versions for a display set
  const getSRVersionsForDisplaySet = useCallback(
    async (displaySetInstanceUID: string): Promise<SRVersion[]> => {
      try {
        const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
          imageDisplaySetInstanceUID: displaySetInstanceUID,
        });
        return versions || [];
      } catch (error) {
        console.error('[Measurements Panel] Failed to get SR versions:', error);
        return [];
      }
    },
    [commandsManager]
  );

  // Load all image data
  const loadImageData = useCallback(async () => {
    console.log('[Measurements Panel] Loading image data...');
    const currentImages = getCurrentlyDisplayedImages();

    if (currentImages.length === 0) {
      setImages([]);
      return;
    }

    // Only keep deletion tracking for currently displayed images
    const currentDisplaySetUIDs = new Set(currentImages.map(img => img.displaySetInstanceUID));
    setDisplaySetsWithDeletions(prev => {
      const filteredDeletions = new Set<string>();
      prev.forEach(uid => {
        if (currentDisplaySetUIDs.has(uid)) {
          filteredDeletions.add(uid);
        }
      });
      return filteredDeletions;
    });

    setLoading(true);
    try {
      // Load data for all images in parallel
      const imageDataPromises = currentImages.map(async ({ displaySetInstanceUID, displaySet }) => {
        const measurements = getMeasurementsForDisplaySet(
          measurementService,
          displaySetInstanceUID
        );
        const srVersions = await getSRVersionsForDisplaySet(displaySetInstanceUID);

        return {
          displaySetInstanceUID,
          displaySetDescription:
            displaySet.SeriesDescription || displaySet.SeriesNumber?.toString() || 'Unknown Series',
          displaySetLabel:
            displaySet.SeriesInstanceUID?.slice(-8) ||
            displaySetInstanceUID?.slice(-8) ||
            'Unknown',
          measurements,
          srVersions,
          selectedSR: srVersions.length > 0 ? srVersions[0] : null,
          loading: false,
        };
      });

      const imageData = await Promise.all(imageDataPromises);
      setImages(imageData);

      console.log(`[Measurements Panel] Loaded data for ${imageData.length} images`);
    } catch (error) {
      console.error('[Measurements Panel] Failed to load image data:', error);
    } finally {
      setLoading(false);
    }
  }, [
    getCurrentlyDisplayedImages,
    getSRVersionsForDisplaySet,
    viewportGridService,
    measurementService,
  ]);

  // Handle SR selection for any image
  const selectSR = useCallback(
    (imageIndex: number, newVersion: SRVersion) => {
      if (imageIndex >= images.length || !newVersion) return;

      const targetImage = images[imageIndex];
      const previousVersion = targetImage.selectedSR;

      console.log(
        `[Measurements Panel] User selected SR for image ${imageIndex}:`,
        `New: ${newVersion.displaySetInstanceUID}, Previous: ${previousVersion?.displaySetInstanceUID || 'none'}`
      );

      // Ensure we have a previous version (required by interface)
      if (!previousVersion) {
        console.error(
          '[Measurements Panel] No previous SR version found - cannot proceed with selection'
        );
        return;
      }

      // Update UI state to show selection and loading
      setImages(prevImages =>
        prevImages.map((imageData, idx) =>
          idx === imageIndex
            ? {
                ...imageData,
                selectedSR: newVersion,
                loading: true,
              }
            : imageData
        )
      );

      // Use OHIF singleton service to broadcast SR selection event
      const { srSelectionService } = servicesManager.services;
      srSelectionService.requestSRSelection({
        displaySetInstanceUID: newVersion.displaySetInstanceUID,
        targetImageDisplaySetUID: targetImage.displaySetInstanceUID,
        previousSRDisplaySetInstanceUID: previousVersion.displaySetInstanceUID,
        source: images.length > 1 ? 'multi-image' : 'single-image',
      });

      console.log('[Measurements Panel] Broadcasted SR selection via OHIF service');
    },
    [images, servicesManager.services]
  );

  // Handle measurement actions - unified for all layouts
  const handleMeasurementAction = useCallback(
    (command: string, uid: string, value?: string) => {
      // Track deletions before executing the command
      if (command === 'removeMeasurement') {
        const measurement = measurementService.getMeasurement(uid);
        if (measurement?.displaySetInstanceUID) {
          setDisplaySetsWithDeletions(prev => new Set(prev).add(measurement.displaySetInstanceUID));
          console.log(
            '[useMeasurementsPanel] Tracked deletion for display set:',
            measurement.displaySetInstanceUID
          );
        }
      }

      if (command === 'updateMeasurementLabel') {
        // Handle inline label update
        const measurement = measurementService.getMeasurement(uid);
        if (measurement) {
          measurementService.update(uid, { ...measurement, label: value }, true);
        }
      } else {
        // Pass all measurements to the command (OHIF pattern)
        const allMeasurements = images.flatMap(img => img.measurements);

        commandsManager.run(command, {
          uid,
          annotationUID: uid,
          displayMeasurements: allMeasurements,
        });
      }
    },
    [measurementService, commandsManager, images, setDisplaySetsWithDeletions]
  );

  // Hide all measurements - unified for all layouts
  const hideAllMeasurements = useCallback(() => {
    const allMeasurements = images.flatMap(img => img.measurements);

    allMeasurements.forEach(measurement => {
      if (measurement.isVisible !== false) {
        commandsManager.run('toggleVisibilityMeasurement', {
          uid: measurement.uid,
          annotationUID: measurement.uid,
        });
      }
    });
  }, [commandsManager, images]);

  // Get all display set UIDs that have changes (dirty measurements + deletions)
  const getModifiedDisplaySetUIDs = useCallback(() => {
    const dirtyUIDs = getDirtyDisplaySetUIDs(measurementService);
    const deletedUIDs = Array.from(displaySetsWithDeletions);

    // Combine and deduplicate
    const allModifiedUIDs = [...new Set([...dirtyUIDs, ...deletedUIDs])];

    console.log('[useMeasurementsPanel] Getting modified display sets:', {
      dirtyDisplaySets: dirtyUIDs,
      deletedDisplaySets: deletedUIDs,
      allModified: allModifiedUIDs,
    });

    return allModifiedUIDs;
  }, [measurementService, displaySetsWithDeletions]);

  // Check for unsaved changes (combines isDirty measurements + deletions)
  const hasUnsavedChanges = useCallback(() => {
    const modifiedUIDs = getModifiedDisplaySetUIDs();
    return modifiedUIDs.length > 0;
  }, [getModifiedDisplaySetUIDs]);

  // Clear unsaved changes tracking (called after successful save)
  const clearUnsavedChanges = useCallback(() => {
    setDisplaySetsWithDeletions(new Set());
    console.log('[useMeasurementsPanel] Cleared unsaved changes tracking');
  }, []);

  // Set up subscriptions
  useEffect(() => {
    console.log('[Measurements Panel] Setting up subscriptions...');

    const updateMeasurements = () => {
      setImages(prevImages =>
        prevImages.map(imageData => {
          const measurements = getMeasurementsForDisplaySet(
            measurementService,
            imageData.displaySetInstanceUID
          );
          return {
            ...imageData,
            measurements,
            loading: false,
          };
        })
      );
    };

    // Layout change subscriptions
    const gridStateSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.GRID_STATE_CHANGED,
      loadImageData
    );

    // Only subscribe to measurement updates (not add/remove which are handled by system)
    // The system handles loading/clearing via layout changes, we only care about user edits
    const measurementSubscription = measurementService.subscribe(
      measurementService.EVENTS.MEASUREMENT_UPDATED,
      updateMeasurements
    );

    const measurementRemovedSubscription = measurementService.subscribe(
      measurementService.EVENTS.MEASUREMENT_REMOVED,
      updateMeasurements
    );

    // Display set change subscription
    const displaySetSubscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      ({ displaySetsAdded }) => {
        // Check if any SR displaySets were added
        const newSRs = displaySetsAdded.filter(
          ds =>
            ds.Modality === 'SR' ||
            (ds.SOPClassHandlerId && ds.SOPClassHandlerId.includes('dicom-sr')) ||
            (ds.SOPClassUID && ds.SOPClassUID.includes('88.'))
        );

        if (newSRs.length > 0) {
          console.log('[Measurements Panel] New SR displaySets added, refreshing data');
          loadImageData();
        }
      }
    );

    return () => {
      gridStateSubscription.unsubscribe();
      displaySetSubscription.unsubscribe();
      measurementSubscription.unsubscribe();
      measurementRemovedSubscription.unsubscribe();
    };
  }, [viewportGridService, displaySetService, measurementService]);

  useEffect(() => {
    loadImageData();
  }, []);

  // Computed values
  const totalMeasurements = useMemo(() => {
    return images.reduce((total, image) => total + image.measurements.length, 0);
  }, [images]);

  const isAnyLoading = useMemo(() => {
    return loading || images.some(image => image.loading);
  }, [loading, images]);

  return {
    // Data
    images,

    // Actions
    selectSR,
    handleMeasurementAction,
    hideAllMeasurements,

    // Editing state
    editingMeasurement,
    setEditingMeasurement,

    // Unsaved changes
    hasUnsavedChanges,
    getModifiedDisplaySetUIDs,
    clearUnsavedChanges,

    // State
    loading: isAnyLoading,
    totalMeasurements,
  };
};
