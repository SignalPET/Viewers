import React from 'react';
import { ScrollArea } from '@ohif/ui-next';

// Components
import { MeasurementHeader, UnsavedAnnotationsDialog } from './components';
import MultiImageMeasurementsBody from './components/MultiImageMeasurementsBody';

// Hooks
import { useUnsavedChanges, useMeasurementsPanel } from '../hooks';

// Utils
import {
  saveMeasurementsWithNotification,
  saveMeasurements,
  shouldMarkAsUnsaved,
  getCurrentDisplaySetUID,
} from '../utils/measurement.utils';

const SignalPETMeasurementsPanel = ({
  servicesManager,
  commandsManager,
}: SignalPETMeasurementsPanelProps) => {
  // Unsaved changes management
  const {
    hasUnsavedChanges,
    showUnsavedDialog,
    markAsUnsaved,
    markAsSaved,
    handleUnsavedDialogSave,
    handleUnsavedDialogLeave,
    handleUnsavedDialogClose,
  } = useUnsavedChanges();

  // Unified measurements panel management (includes everything)
  const {
    images,
    selectSR,
    handleMeasurementAction,
    hideAllMeasurements,
    editingMeasurement,
    setEditingMeasurement,
    loading: panelLoading,
    totalMeasurements,
    isMultiImageLayout,
  } = useMeasurementsPanel({
    servicesManager,
    commandsManager,
    onMeasurementChange: markAsUnsaved,
  });

  // Wrapper to track unsaved changes
  const handleMeasurementActionWithTracking = (command: string, uid: string, value?: string) => {
    // Track changes for commands that modify measurements
    if (shouldMarkAsUnsaved(command)) {
      markAsUnsaved();
    }

    handleMeasurementAction(command, uid, value);
  };

  // Unified SR selection handler (works for single or multi-image)
  const handleSRSelection = (sr: any, imageIndex: number = 0) => {
    if (!sr) return;

    console.log('[Panel] User selected SR for image', imageIndex);
    selectSR(imageIndex, sr);
  };

  // Handle save measurements with proper error handling
  const handleSaveMeasurements = async () => {
    if (!isMultiImageLayout) {
      // Single image mode - use existing logic
      try {
        await saveMeasurementsWithNotification(
          servicesManager.services.measurementService,
          commandsManager,
          servicesManager.services.uiNotificationService,
          getCurrentDisplaySetUID(servicesManager)
        );

        markAsSaved();
      } catch (error) {
        // Error handling is done in the utility function
      }
    } else {
      // Multi-image mode - save all images
      await handleSaveAllImages();
    }
  };

  // Handle save all images in multi-image mode
  const handleSaveAllImages = async () => {
    if (images.length === 0) {
      servicesManager.services.uiNotificationService.show({
        title: 'No Images',
        message: 'No images found to save measurements for.',
        type: 'warning',
        duration: 4000,
      });
      return;
    }

    const totalImages = images.length;
    let savedCount = 0;
    let errors: string[] = [];

    try {
      // Save measurements for each image (without individual notifications)
      for (const image of images) {
        try {
          await saveMeasurements(
            servicesManager.services.measurementService,
            commandsManager,
            servicesManager.services.uiNotificationService,
            image.displaySetInstanceUID,
            false // Don't show individual notifications
          );
          savedCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${image.displaySetDescription}: ${errorMsg}`);
        }
      }

      // Show overall result
      if (savedCount === totalImages) {
        servicesManager.services.uiNotificationService.show({
          title: 'Save All Complete',
          message: `Successfully saved measurements for all ${totalImages} images`,
          type: 'success',
          duration: 4000,
        });
        markAsSaved();
      } else if (savedCount > 0) {
        servicesManager.services.uiNotificationService.show({
          title: 'Partial Save Complete',
          message: `Saved ${savedCount}/${totalImages} images. ${errors.length} failed.`,
          type: 'warning',
          duration: 6000,
        });
      } else {
        servicesManager.services.uiNotificationService.show({
          title: 'Save All Failed',
          message: `Failed to save any measurements. First error: ${errors[0] || 'Unknown error'}`,
          type: 'error',
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('[Panel] Failed to save all images:', error);
      servicesManager.services.uiNotificationService.show({
        title: 'Save All Failed',
        message: 'An unexpected error occurred while saving measurements.',
        type: 'error',
        duration: 5000,
      });
    }
  };

  // Handle save measurements for individual image
  const handleSaveImageMeasurements = async (imageIndex: number) => {
    if (imageIndex >= images.length) return;

    const targetImage = images[imageIndex];
    try {
      await saveMeasurementsWithNotification(
        servicesManager.services.measurementService,
        commandsManager,
        servicesManager.services.uiNotificationService,
        targetImage.displaySetInstanceUID
      );

      markAsSaved();
    } catch (error) {
      // Error handling is done in the utility function
    }
  };

  // Unsaved dialog save handler
  const handleDialogSave = async () => {
    await handleUnsavedDialogSave(handleSaveMeasurements);
  };

  return (
    <ScrollArea>
      <div
        data-cy="signalpet-measurements-panel"
        className="relative min-h-full border-[#0c3b46] border-[0px_1px_1px] bg-[#08252c]"
      >
        {/* Header - unified for all layouts */}
        <MeasurementHeader
          onSaveMeasurements={handleSaveMeasurements}
          loading={panelLoading}
          measurementCount={totalMeasurements}
          onHideAll={hideAllMeasurements}
          isMultiImage={isMultiImageLayout}
        />

        {/* Measurements Body - unified for all layouts */}
        <MultiImageMeasurementsBody
          imagesMeasurements={images}
          onAction={handleMeasurementActionWithTracking}
          editingMeasurement={editingMeasurement}
          setEditingMeasurement={setEditingMeasurement}
          onSRSelection={(imageIndex, sr) => handleSRSelection(sr, imageIndex)}
          onSaveImage={handleSaveImageMeasurements}
          loading={panelLoading}
        />
      </div>

      {/* Unsaved Annotations Dialog */}
      {showUnsavedDialog && (
        <UnsavedAnnotationsDialog
          onClose={handleUnsavedDialogClose}
          onSave={handleDialogSave}
          onLeaveWithoutSaving={handleUnsavedDialogLeave}
          loading={panelLoading}
        />
      )}
    </ScrollArea>
  );
};

type SignalPETMeasurementsPanelProps = {
  servicesManager: any;
  commandsManager: any;
  [key: string]: any;
};

export default SignalPETMeasurementsPanel;
