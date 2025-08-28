import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@ohif/ui-next';

// Components
import { MeasurementHeader, UnsavedAnnotationsDialog } from './components';
import MultiImageMeasurementsBody from './components/MultiImageMeasurementsBody';

// Hooks
import { useUnsavedChanges, useMeasurementsPanel } from '../hooks';

// Utils
import { isOhifMessage, sendDialogResponse } from '../utils/simple-messaging';
import {
  saveSRForImage,
  showMeasurementNotification,
  getMeasurementsForDisplaySet,
} from '../utils/measurement.utils';

const SignalPETMeasurementsPanel = ({
  servicesManager,
  commandsManager,
}: SignalPETMeasurementsPanelProps) => {
  const {
    images,
    selectSR,
    handleMeasurementAction,
    hideAllMeasurements,
    editingMeasurement,
    setEditingMeasurement,
    loading: panelLoading,
    totalMeasurements,
  } = useMeasurementsPanel({
    servicesManager,
    commandsManager,
  });

  // Listen for navigation attempts from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isOhifMessage(event.data)) return;

      if (event.data.type === 'OHIF_NAVIGATION_ATTEMPT') {
        // Parent is trying to navigate and wants us to handle the dialog
        setShowUnsavedDialog(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Handle save measurements: imageIndex = save that image, no index = save all
  const handleSaveMeasurements = async (imageIndex?: number) => {
    try {
      if (imageIndex !== undefined) {
        // Save specific image with individual notification
        const targetImage = images[imageIndex];
        if (!targetImage) return;

        // Get count for notification purposes
        const measurementCount = getMeasurementsForDisplaySet(
          servicesManager.services.measurementService,
          targetImage.displaySetInstanceUID
        ).length;

        await saveSRForImage(commandsManager, targetImage.displaySetInstanceUID);

        showMeasurementNotification(
          servicesManager.services.uiNotificationService,
          'success',
          'Saved',
          `Saved ${measurementCount} measurements for ${targetImage.displaySetDescription}`
        );
      } else {
        // Save all images with bulk notification
        const totalImages = images.length;
        let savedCount = 0;
        let totalMeasurements = 0;

        for (const image of images) {
          try {
            // Get count for notification purposes
            const measurementCount = getMeasurementsForDisplaySet(
              servicesManager.services.measurementService,
              image.displaySetInstanceUID
            ).length;

            await saveSRForImage(commandsManager, image.displaySetInstanceUID);

            savedCount++;
            totalMeasurements += measurementCount;
          } catch (error) {
            console.error(`Failed to save image ${image.displaySetDescription}:`, error);
          }
        }

        // Show appropriate notification for Save All
        if (savedCount === totalImages) {
          showMeasurementNotification(
            servicesManager.services.uiNotificationService,
            'success',
            'Save All Complete',
            `Successfully saved ${totalMeasurements} measurements across ${savedCount} images`
          );
        } else if (savedCount > 0) {
          showMeasurementNotification(
            servicesManager.services.uiNotificationService,
            'warning',
            'Partial Save',
            `Saved ${savedCount}/${totalImages} images (${totalMeasurements} measurements)`
          );
        } else {
          showMeasurementNotification(
            servicesManager.services.uiNotificationService,
            'error',
            'Save All Failed',
            'Failed to save any images'
          );
        }
      }
    } catch (error) {
      // Handle validation errors (no measurements, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'No measurements to save') {
        showMeasurementNotification(
          servicesManager.services.uiNotificationService,
          'warning',
          'No Measurements',
          'No measurements to save. Please create some measurements first.'
        );
      } else {
        showMeasurementNotification(
          servicesManager.services.uiNotificationService,
          'error',
          'Save Failed',
          errorMessage
        );
      }
    }
  };

  // Dialog state management

  // Unified SR selection handler (works for single or multi-image)
  const handleSRSelection = (sr: any, imageIndex: number = 0) => {
    if (!sr) return;

    console.log('[Panel] User selected SR for image', imageIndex);
    selectSR(imageIndex, sr);
  };

  // Dialog handlers
  const handleSaveFromDialog = async () => {
    try {
      await handleSaveMeasurements();
      sendDialogResponse('continue');
    } catch (error) {
      console.error('Failed to save measurements:', error);
    }
  };

  const handleDialogLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false);

    // Notify parent that we're discarding changes and they can proceed
    sendDialogResponse('continue');
  };

  const handleDialogClose = () => {
    setShowUnsavedDialog(false);
    sendDialogResponse('cancel');
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
          isMultiImage={images.length > 1}
        />

        {/* Measurements Body - unified for all layouts */}
        <MultiImageMeasurementsBody
          imagesMeasurements={images}
          onAction={handleMeasurementAction}
          editingMeasurement={editingMeasurement}
          setEditingMeasurement={setEditingMeasurement}
          onSRSelection={(imageIndex, sr) => handleSRSelection(sr, imageIndex)}
          onSaveImage={handleSaveMeasurements}
          loading={panelLoading}
        />
      </div>

      {/* Unsaved Annotations Dialog */}
      {showUnsavedDialog && (
        <UnsavedAnnotationsDialog
          onClose={handleDialogClose}
          onSave={handleSaveFromDialog}
          onLeaveWithoutSaving={handleDialogLeaveWithoutSaving}
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
