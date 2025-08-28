import { useState, useEffect, useCallback } from 'react';

interface UseUnsavedChangesOptions {
  servicesManager: any;
}

export const useUnsavedChanges = ({ servicesManager }: UseUnsavedChangesOptions) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'You have unsaved annotations. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message; // Chrome requires returnValue to be set
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const markAsUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  // Auto-subscribe to measurement service events
  useEffect(() => {
    const { measurementService } = servicesManager.services;
    if (!measurementService) return;

    const handleMeasurementChange = () => markAsUnsaved();

    // Subscribe to all measurement change events
    const subscriptions = [
      measurementService.subscribe(
        measurementService.EVENTS.MEASUREMENT_ADDED,
        handleMeasurementChange
      ),
      measurementService.subscribe(
        measurementService.EVENTS.MEASUREMENT_UPDATED,
        handleMeasurementChange
      ),
      measurementService.subscribe(
        measurementService.EVENTS.MEASUREMENT_REMOVED,
        handleMeasurementChange
      ),
    ];

    return () => {
      subscriptions.forEach(subscription => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      });
    };
  }, [servicesManager, markAsUnsaved]);

  return {
    hasUnsavedChanges,
    markAsUnsaved,
    markAsSaved,
  };
};
