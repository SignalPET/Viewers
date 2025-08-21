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
        />

        {/* Measurements Body - unified for all layouts */}
        <MultiImageMeasurementsBody
          imagesMeasurements={images}
          onAction={handleMeasurementActionWithTracking}
          editingMeasurement={editingMeasurement}
          setEditingMeasurement={setEditingMeasurement}
          onSRSelection={(imageIndex, sr) => handleSRSelection(sr, imageIndex)}
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
