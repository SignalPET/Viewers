import React from 'react';
import { ScrollArea } from '@ohif/ui-next';

// Components
import { MeasurementHeader, MeasurementsBody, UnsavedAnnotationsDialog } from './components';

// Hooks
import { useMeasurements, useSRVersions, useUnsavedChanges } from '../hooks';

// Utils
import { saveMeasurementsWithNotification, shouldMarkAsUnsaved } from '../utils/measurement.utils';

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

  // SR versions management
  const {
    srVersions,
    selectedSR,
    loading,
    loadSRDataForDisplaySet,
    applySR,
    getCurrentDisplaySetUID,
  } = useSRVersions({
    servicesManager,
    commandsManager,
    onSRApplied: () => {
      loadMeasurementsFromService();
      markAsSaved();
    },
  });

  // Measurements management
  const {
    measurements,
    editingMeasurement,
    setEditingMeasurement,
    loadMeasurementsFromService,
    handleMeasurementAction: baseMeasurementAction,
    hideAllMeasurements,
  } = useMeasurements({
    servicesManager,
    commandsManager,
    onMeasurementChange: markAsUnsaved,
  });

  const handleMeasurementAction = (command: string, uid: string, value?: string) => {
    // Track changes for commands that modify measurements
    if (shouldMarkAsUnsaved(command)) {
      markAsUnsaved();
    }

    baseMeasurementAction(command, uid, value);
  };

  const handleSRSelection = async (sr: any) => {
    if (!sr) return;

    try {
      await applySR(sr);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Handle save measurements with proper error handling
  const handleSaveMeasurements = async () => {
    try {
      await saveMeasurementsWithNotification(
        servicesManager.services.measurementService,
        commandsManager,
        servicesManager.services.uiNotificationService,
        getCurrentDisplaySetUID,
        loadSRDataForDisplaySet
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
        {/* Custom Header */}
        <MeasurementHeader
          srVersions={srVersions}
          selectedSR={selectedSR}
          onSRSelection={handleSRSelection}
          onSaveMeasurements={handleSaveMeasurements}
          loading={loading}
          measurementCount={measurements.length}
          onHideAll={hideAllMeasurements}
        />

        {/* Custom Measurements Body */}
        <MeasurementsBody
          measurements={measurements}
          onAction={handleMeasurementAction}
          editingMeasurement={editingMeasurement}
          setEditingMeasurement={setEditingMeasurement}
        />
      </div>

      {/* Unsaved Annotations Dialog */}
      {showUnsavedDialog && (
        <UnsavedAnnotationsDialog
          onClose={handleUnsavedDialogClose}
          onSave={handleDialogSave}
          onLeaveWithoutSaving={handleUnsavedDialogLeave}
          loading={loading}
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
