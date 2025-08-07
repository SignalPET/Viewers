import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@ohif/ui-next';

// Components
import { MeasurementHeader, MeasurementsBody } from './components';

// Types
import type { Measurement } from '../types';

const SignalPETMeasurementsPanel = ({
  servicesManager,
  commandsManager,
  ...props
}: SignalPETMeasurementsPanelProps) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [srVersions, setSRVersions] = useState([]);
  const [selectedSR, setSelectedSR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeImageUID, setActiveImageUID] = useState(null);
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);

  // Get currently active image - using services instead of props
  useEffect(() => {
    const { displaySetService, viewportGridService } = servicesManager.services;

    const updateActiveImage = () => {
      try {
        const activeViewportId = viewportGridService.getActiveViewportId();

        if (activeViewportId) {
          const viewportGridState = viewportGridService.getState();
          const viewport = viewportGridState.viewports.get(activeViewportId);

          if (viewport?.displaySetInstanceUIDs?.[0]) {
            const displaySetInstanceUID = viewport.displaySetInstanceUIDs[0];
            setActiveImageUID(displaySetInstanceUID);
          } else {
            setActiveImageUID(null);
          }
        } else {
          setActiveImageUID(null);
        }
      } catch (error) {
        console.warn('[SignalPET Measurements Panel] Could not get active viewport info:', error);
        setActiveImageUID(null);
      }
    };

    updateActiveImage();

    // Listen for viewport changes
    const subscription = servicesManager.services.viewportGridService.subscribe(
      servicesManager.services.viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
      updateActiveImage
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [servicesManager, props]);

  // Load measurements when active image changes
  useEffect(() => {
    if (activeImageUID) {
      loadMeasurementsForImage(activeImageUID);
    }
  }, [activeImageUID]);

  // Listen for measurement changes
  useEffect(() => {
    const { measurementService } = servicesManager.services;

    const updateMeasurements = () => {
      loadCurrentMeasurements();
    };

    // Subscribe to measurement events
    const subscriptions = [
      measurementService.subscribe(measurementService.EVENTS.MEASUREMENT_ADDED, updateMeasurements),
      measurementService.subscribe(
        measurementService.EVENTS.MEASUREMENT_UPDATED,
        updateMeasurements
      ),
      measurementService.subscribe(
        measurementService.EVENTS.MEASUREMENT_REMOVED,
        updateMeasurements
      ),
    ];

    // Load initial measurements
    loadCurrentMeasurements();

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [servicesManager]);

  const loadMeasurementsForImage = async (imageUID: string) => {
    if (!imageUID) return;

    setLoading(true);
    try {
      // Load SR versions for this image
      const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
        imageDisplaySetInstanceUID: imageUID,
      });

      setSRVersions(versions || []);

      if (versions?.length > 0) {
        // Find the latest loaded/hydrated SR or auto-select the first one
        const latestLoaded = versions.find((sr: any) => sr.isHydrated || sr.isLoaded);
        const srToSelect = latestLoaded || versions[0];

        if (srToSelect) {
          await handleSRSelection(srToSelect);
        }
      } else {
        // No SR versions, just load current measurements
        setSelectedSR(null);
        loadCurrentMeasurements();
      }
    } catch (error) {
      console.error('[SignalPET Measurements Panel] Failed to load measurements:', error);
      setSRVersions([]);
      setSelectedSR(null);
      loadCurrentMeasurements(); // Still try to load any current measurements
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentMeasurements = () => {
    const { measurementService } = servicesManager.services;
    const allMeasurements = measurementService.getMeasurements();

    // Transform measurements to match our interface
    const transformedMeasurements: Measurement[] = allMeasurements.map((measurement, index) => {
      // Extract primary and secondary display text
      const primaryText = measurement.displayText?.primary
        ? measurement.displayText.primary.join(' ')
        : '';
      const secondaryText = measurement.displayText?.secondary
        ? measurement.displayText.secondary.join(' ')
        : '';

      const toolName = measurement.toolName || 'Unknown';

      return {
        uid: measurement.uid,
        label: measurement.label,
        toolName: toolName,
        primaryValue: primaryText,
        secondaryValue: secondaryText,
        sequenceNumber: index + 1,
        isVisible: measurement.isVisible !== false,
        rawData: measurement.data,
      };
    });

    setMeasurements(transformedMeasurements);
  };

  const handleSRSelection = async (sr: any) => {
    if (!sr) return;

    setLoading(true);
    try {
      // Apply the selected SR
      await commandsManager.runCommand('signalpetApplySR', {
        displaySetInstanceUID: sr.displaySetInstanceUID,
      });
      setSelectedSR(sr);

      // Load measurements from the applied SR
      loadCurrentMeasurements();
    } catch (error) {
      console.error('[SignalPET Measurements Panel] Failed to apply SR version:', error);
      const { uiNotificationService } = servicesManager.services;
      uiNotificationService.show({
        title: 'Load Failed',
        message:
          'Failed to load measurements: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeasurements = async () => {
    const { measurementService, uiNotificationService } = servicesManager.services;
    const currentMeasurements = measurementService.getMeasurements();

    if (!currentMeasurements || currentMeasurements.length === 0) {
      uiNotificationService.show({
        title: 'No Measurements',
        message: 'No measurements to save. Please create some measurements first.',
        type: 'warning',
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      // Generate timestamp-based description
      const now = new Date();
      const timestamp = now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const description = `Measurements ${timestamp}`;

      // Use the proper SignalPET save command with timestamp description
      await commandsManager.runCommand('signalpetSaveSR', {
        description: description,
      });

      // Refresh the SR versions list to include the newly saved SR
      if (activeImageUID) {
        await loadMeasurementsForImage(activeImageUID);
      }

      // Show success message
      uiNotificationService.show({
        title: 'SR Saved Successfully',
        message: `Successfully saved ${currentMeasurements.length} measurements as "${description}"`,
        type: 'success',
        duration: 4000,
      });
    } catch (error) {
      console.error('[SignalPET Measurements Panel] Failed to save SR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      uiNotificationService.show({
        title: 'Save Failed',
        message: `Failed to save measurements as SR: ${errorMessage}`,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Hide all measurements handler
  const handleHideAll = () => {
    measurements.forEach(measurement => {
      if (measurement.isVisible !== false) {
        commandsManager.run('toggleVisibilityMeasurement', {
          uid: measurement.uid,
          annotationUID: measurement.uid,
        });
      }
    });
  };

  // Measurement action handler
  const handleMeasurementAction = (command: string, uid: string, value?: string) => {
    if (command === 'updateMeasurementLabel') {
      // Handle inline label update
      const { measurementService } = servicesManager.services;
      const measurement = measurementService.getMeasurement(uid);
      if (measurement) {
        measurementService.update(uid, { ...measurement, label: value }, true);
      }
    } else {
      commandsManager.run(command, { uid, annotationUID: uid, displayMeasurements: measurements });
    }
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
          onHideAll={handleHideAll}
        />

        {/* Custom Measurements Body */}
        <MeasurementsBody
          measurements={measurements}
          onAction={handleMeasurementAction}
          editingMeasurement={editingMeasurement}
          setEditingMeasurement={setEditingMeasurement}
        />
      </div>
    </ScrollArea>
  );
};

type SignalPETMeasurementsPanelProps = {
  servicesManager: any;
  commandsManager: any;
  [key: string]: any;
};

export default SignalPETMeasurementsPanel;
