import { useState, useEffect } from 'react';

interface UseUnsavedChangesOptions {
  onBeforeUnload?: (hasChanges: boolean) => void;
}

export const useUnsavedChanges = ({ onBeforeUnload }: UseUnsavedChangesOptions = {}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ''; // Chrome requires returnValue to be set
        onBeforeUnload?.(hasUnsavedChanges);
        return 'You have unsaved annotations. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, onBeforeUnload]);

  // Expose method to check for unsaved changes before navigation
  const checkUnsavedChanges = (navigationCallback?: () => void) => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      if (navigationCallback) {
        setPendingNavigation(() => navigationCallback);
      }
      return false; // Navigation should be blocked
    }
    return true; // Safe to navigate
  };

  // Expose the checkUnsavedChanges function globally for external access
  useEffect(() => {
    (window as any).signalPETCheckUnsavedChanges = checkUnsavedChanges;

    return () => {
      delete (window as any).signalPETCheckUnsavedChanges;
    };
  }, [hasUnsavedChanges]);

  const markAsUnsaved = () => setHasUnsavedChanges(true);
  const markAsSaved = () => setHasUnsavedChanges(false);

  const handleUnsavedDialogSave = async (saveCallback: () => Promise<void>) => {
    try {
      await saveCallback();
      setShowUnsavedDialog(false);
      markAsSaved();
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Failed to save annotations:', error);
      // Keep dialog open on error
      throw error;
    }
  };

  const handleUnsavedDialogLeave = () => {
    markAsSaved();
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleUnsavedDialogClose = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  return {
    hasUnsavedChanges,
    showUnsavedDialog,
    markAsUnsaved,
    markAsSaved,
    checkUnsavedChanges,
    handleUnsavedDialogSave,
    handleUnsavedDialogLeave,
    handleUnsavedDialogClose,
  };
};
