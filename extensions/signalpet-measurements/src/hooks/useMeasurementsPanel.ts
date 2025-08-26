import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Measurement, SRVersion } from '../types';
import { getMeasurementsForDisplaySet } from '../utils/measurement.utils';

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
  onMeasurementChange?: () => void;
}

export const useMeasurementsPanel = ({
  servicesManager,
  commandsManager,
  onMeasurementChange,
}: UseMeasurementsPanelOptions) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);

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
    (imageIndex: number, sr: SRVersion) => {
      if (imageIndex >= images.length || !sr) return;

      const targetImage = images[imageIndex];
      console.log(
        `[Measurements Panel] User selected SR for image ${imageIndex}:`,
        sr.displaySetInstanceUID
      );

      // Update UI state to show selection and loading
      setImages(prevImages =>
        prevImages.map((imageData, idx) =>
          idx === imageIndex
            ? {
                ...imageData,
                selectedSR: sr,
                loading: true,
              }
            : imageData
        )
      );

      // Use OHIF singleton service to broadcast SR selection event
      const { srSelectionService } = servicesManager.services;
      srSelectionService.requestSRSelection({
        displaySetInstanceUID: sr.displaySetInstanceUID,
        targetImageDisplaySetUID: targetImage.displaySetInstanceUID,
        source: images.length > 1 ? 'multi-image' : 'single-image',
      });

      console.log('[Measurements Panel] Broadcasted SR selection via OHIF service');
    },
    [images, servicesManager.services]
  );

  // Handle measurement actions - unified for all layouts
  const handleMeasurementAction = useCallback(
    (command: string, uid: string, value?: string) => {
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
    [measurementService, commandsManager, images]
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
      onMeasurementChange?.();
    };

    const updateData = () => {
      loadImageData();
      onMeasurementChange?.();
    };

    // Layout change subscriptions
    const gridStateSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.GRID_STATE_CHANGED,
      updateData
    );

    // Only subscribe to measurement updates (not add/remove which are handled by system)
    // The system handles loading/clearing via layout changes, we only care about user edits
    const measurementSubscription = measurementService.subscribe(
      measurementService.EVENTS.MEASUREMENT_UPDATED,
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

    // State
    loading: isAnyLoading,
    totalMeasurements,
  };
};
