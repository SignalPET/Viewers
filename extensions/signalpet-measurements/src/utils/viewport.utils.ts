/**
 * Viewport utility functions for checking viewport readiness and calibration
 * These functions help prevent coordinate transformation issues when loading annotations
 */

import type { Types } from '@ohif/core';

export interface ViewportCalibrationResult {
  isReady: boolean;
  reason?: string;
  details?: {
    viewportId: string;
    imageDimensions?: number[];
    canvasSize?: { width: number; height: number };
    hasCamera: boolean;
    hasImageData: boolean;
    hasValidSpacing?: boolean;
  };
}

/**
 * Check if the viewport is properly calibrated with correct image dimensions
 * This prevents annotations from jumping to top-left corner due to improper coordinate transformation
 */
export async function checkViewportCalibration(
  viewportId: string,
  servicesManager: AppTypes.ServicesManager
): Promise<ViewportCalibrationResult> {
  try {
    const { cornerstoneViewportService } = servicesManager.services;

    // Get the cornerstone viewport
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
    if (!viewport) {
      return {
        isReady: false,
        reason: 'No cornerstone viewport found',
        details: { viewportId, hasCamera: false, hasImageData: false },
      };
    }

    // Check if viewport has an image
    const image = viewport.getDefaultActor()?.actor?.getMapper?.()?.getInputData?.();
    if (!image) {
      return {
        isReady: false,
        reason: 'No image data in viewport',
        details: { viewportId, hasCamera: false, hasImageData: false },
      };
    }

    // Check image dimensions - should not be 0 or undefined
    const dimensions = image.getDimensions?.();
    if (!dimensions || dimensions[0] <= 0 || dimensions[1] <= 0) {
      return {
        isReady: false,
        reason: 'Invalid image dimensions',
        details: {
          viewportId,
          imageDimensions: dimensions,
          hasCamera: false,
          hasImageData: true,
        },
      };
    }

    // Check viewport camera and canvas
    const camera = viewport.getCamera();
    const canvas = viewport.getCanvas();

    if (!camera || !canvas) {
      return {
        isReady: false,
        reason: 'Viewport camera or canvas not ready',
        details: {
          viewportId,
          imageDimensions: dimensions,
          hasCamera: !!camera,
          hasImageData: true,
        },
      };
    }

    // Check canvas dimensions - should match actual display size
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) {
      return {
        isReady: false,
        reason: 'Canvas has invalid dimensions',
        details: {
          viewportId,
          imageDimensions: dimensions,
          canvasSize: { width: canvasRect.width, height: canvasRect.height },
          hasCamera: true,
          hasImageData: true,
        },
      };
    }

    // Check if image is properly positioned (not at origin with tiny size)
    const imageData = viewport.getImageData();
    let hasValidSpacing = true;
    if (imageData) {
      const spacing = imageData.getSpacing?.();
      if (spacing && (spacing[0] <= 0 || spacing[1] <= 0)) {
        hasValidSpacing = false;
        return {
          isReady: false,
          reason: 'Invalid image spacing',
          details: {
            viewportId,
            imageDimensions: dimensions,
            canvasSize: { width: canvasRect.width, height: canvasRect.height },
            hasCamera: true,
            hasImageData: true,
            hasValidSpacing: false,
          },
        };
      }
    }

    // All checks passed
    return {
      isReady: true,
      details: {
        viewportId,
        imageDimensions: dimensions,
        canvasSize: { width: canvasRect.width, height: canvasRect.height },
        hasCamera: true,
        hasImageData: true,
        hasValidSpacing,
      },
    };
  } catch (error) {
    console.error('[Viewport Utils] Error checking viewport calibration:', error);
    // If we can't check, assume it's ready to avoid blocking
    return {
      isReady: true,
      reason: 'Error during check - assuming ready',
      details: { viewportId, hasCamera: false, hasImageData: false },
    };
  }
}

/**
 * Check if target images for an SR are loaded and the viewport is properly calibrated
 */
export async function checkTargetImagesReady(
  referencedSOPs: string[],
  servicesManager: AppTypes.ServicesManager
): Promise<{
  imagesReady: boolean;
  viewportReady: boolean;
  reason?: string;
  targetDisplaySets?: Types.DisplaySet[];
}> {
  try {
    if (referencedSOPs.length === 0) {
      console.log('[Viewport Utils] No referenced SOPs found, considering images as loaded');
      return { imagesReady: true, viewportReady: true };
    }

    // Check if we can find display sets for the referenced images
    const { displaySetService, viewportGridService } = servicesManager.services;
    const activeDisplaySets = displaySetService.getActiveDisplaySets();

    // Find display sets that contain the referenced SOPs
    const targetDisplaySets = activeDisplaySets.filter(ds => {
      if (!ds.instances) return false;
      return ds.instances.some(instance => referencedSOPs.includes(instance.SOPInstanceUID));
    });

    if (targetDisplaySets.length === 0) {
      return {
        imagesReady: false,
        viewportReady: false,
        reason: 'No target display sets found for referenced SOPs',
      };
    }

    // Check if the target display sets are loaded
    for (const displaySet of targetDisplaySets) {
      // Check if displaySet has the expected properties indicating it's loaded
      const isDisplaySetLoaded =
        (displaySet as any).isLoaded !== false &&
        displaySet.instances &&
        displaySet.instances.length > 0;

      if (!isDisplaySetLoaded) {
        return {
          imagesReady: false,
          viewportReady: false,
          reason: `Display set not fully loaded: ${displaySet.displaySetInstanceUID}`,
          targetDisplaySets,
        };
      }
    }

    // Check if any of the target images are currently in viewports (more reliable indicator)
    const activeViewportId = viewportGridService.getActiveViewportId();
    if (activeViewportId) {
      const viewportDisplaySetUIDs =
        viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId);
      const hasTargetInViewport = targetDisplaySets.some(ds =>
        viewportDisplaySetUIDs.includes(ds.displaySetInstanceUID)
      );

      if (hasTargetInViewport) {
        // CRITICAL: Check if viewport is properly calibrated to prevent coordinate jumping
        const calibrationResult = await checkViewportCalibration(activeViewportId, servicesManager);

        return {
          imagesReady: true,
          viewportReady: calibrationResult.isReady,
          reason: calibrationResult.isReady
            ? 'Target image is in active viewport and properly calibrated'
            : calibrationResult.reason,
          targetDisplaySets,
        };
      }
    }

    return {
      imagesReady: true,
      viewportReady: true,
      reason: `Target display sets found and loaded: ${targetDisplaySets.length}`,
      targetDisplaySets,
    };
  } catch (error) {
    console.error('[Viewport Utils] Error checking target images:', error);
    // In case of error, assume images are loaded to avoid infinite retry
    return {
      imagesReady: true,
      viewportReady: true,
      reason: 'Error during check - assuming ready',
    };
  }
}
