import { useState, useEffect } from 'react';
import type { SRVersion } from '../types';

interface UseSRVersionsOptions {
  servicesManager: any;
  commandsManager: any;
  onSRApplied?: (sr: SRVersion | null) => void;
  clearMeasurements?: () => void;
}

export const useSRVersions = ({
  servicesManager,
  commandsManager,
  onSRApplied,
}: UseSRVersionsOptions) => {
  const [srVersions, setSRVersions] = useState<SRVersion[]>([]);
  const [selectedSR, setSelectedSR] = useState<SRVersion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { viewportGridService, displaySetService } = servicesManager.services;

    const handleGridStateChange = () => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const displaySetInstanceUID =
        viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];

      if (displaySetInstanceUID) {
        // Only load SR versions list for UI display - do NOT apply SR
        // The init.ts handles the actual measurement loading/clearing
        getSRVersionsList(displaySetInstanceUID);
      }
    };

    const handleDisplaySetsAdded = ({ displaySetsAdded }) => {
      // Check if any SR displaySets were added
      const newSRs = displaySetsAdded.filter(
        ds =>
          ds.Modality === 'SR' ||
          (ds.SOPClassHandlerId && ds.SOPClassHandlerId.includes('dicom-sr')) ||
          (ds.SOPClassUID && ds.SOPClassUID.includes('88.'))
      );

      if (newSRs.length > 0) {
        console.log('[SR Versions Hook] New SR displaySets added, refreshing versions list');
        // Refresh the current image's SR versions
        const activeViewportId = viewportGridService.getActiveViewportId();
        const displaySetInstanceUID =
          viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];

        if (displaySetInstanceUID) {
          getSRVersionsList(displaySetInstanceUID);
        }
      }
    };

    // Listen for grid state changes (when displaySets change in viewports)
    const gridSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.GRID_STATE_CHANGED,
      handleGridStateChange
    );

    // Listen for active viewport changes (when user focuses on different viewport)
    const activeViewportSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
      handleGridStateChange
    );

    // Listen for new displaySets being added (including newly saved SRs)
    const displaySetSubscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      handleDisplaySetsAdded
    );

    // Load initial data
    handleGridStateChange();

    return () => {
      gridSubscription.unsubscribe();
      activeViewportSubscription.unsubscribe();
      displaySetSubscription.unsubscribe();
    };
  }, [servicesManager]);

  const getSRVersionsList = async (displaySetInstanceUID: string) => {
    if (!displaySetInstanceUID) return;

    setLoading(true);
    try {
      const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
        imageDisplaySetInstanceUID: displaySetInstanceUID,
      });

      setSRVersions(versions || []);

      // Just set the UI state - don't apply any SR (init.ts handles that)
      if (versions?.length > 0) {
        setSelectedSR(versions[0]);
      }
    } catch (error) {
      console.error('[SR Versions Hook] Failed to load SR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySR = async (sr: SRVersion) => {
    if (!sr) return;

    setLoading(true);
    try {
      await commandsManager.runCommand('signalpetApplySR', {
        displaySetInstanceUID: sr.displaySetInstanceUID,
      });

      setSelectedSR(sr);
      onSRApplied?.(sr);
    } catch (error) {
      console.error('[SR Versions Hook] Failed to apply SR version:', error);
      const { uiNotificationService } = servicesManager.services;
      uiNotificationService.show({
        title: 'Load Failed',
        message:
          'Failed to load measurements: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        type: 'error',
        duration: 5000,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    srVersions,
    selectedSR,
    loading,
    applySR,
  };
};
