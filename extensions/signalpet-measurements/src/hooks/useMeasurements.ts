import { useState, useEffect } from 'react';
import type { Measurement } from '../types';

interface UseMeasurementsOptions {
  servicesManager: any;
  commandsManager: any;
  onMeasurementChange?: () => void;
}

export const useMeasurements = ({
  servicesManager,
  commandsManager,
  onMeasurementChange,
}: UseMeasurementsOptions) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);

  const loadMeasurementsFromService = () => {
    const { measurementService } = servicesManager.services;
    const allMeasurements = measurementService.getMeasurements();
    setMeasurements(allMeasurements);
  };

  useEffect(() => {
    const { measurementService } = servicesManager.services;

    const updateMeasurements = () => {
      loadMeasurementsFromService();
      onMeasurementChange?.();
    };

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

    loadMeasurementsFromService();

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [servicesManager, onMeasurementChange]);

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

  const hideAllMeasurements = () => {
    measurements.forEach(measurement => {
      if (measurement.isVisible !== false) {
        commandsManager.run('toggleVisibilityMeasurement', {
          uid: measurement.uid,
          annotationUID: measurement.uid,
        });
      }
    });
  };

  return {
    measurements,
    editingMeasurement,
    setEditingMeasurement,
    loadMeasurementsFromService,
    handleMeasurementAction,
    hideAllMeasurements,
  };
};
