import { useState, useEffect } from 'react';
import type { SRVersion } from '../types';

interface UseSRVersionsOptions {
  servicesManager: any;
  commandsManager: any;
  onSRApplied?: (sr: SRVersion | null) => void;
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
    const handleGridStateChange = () => {
      const { viewportGridService } = servicesManager.services;
      const activeViewportId = viewportGridService.getActiveViewportId();
      const displaySetInstanceUID =
        viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];

      if (displaySetInstanceUID) {
        loadSRDataForDisplaySet(displaySetInstanceUID);
      }
    };

    // Listen for grid state changes (when displaySets change in viewports)
    const subscription = servicesManager.services.viewportGridService.subscribe(
      servicesManager.services.viewportGridService.EVENTS.GRID_STATE_CHANGED,
      handleGridStateChange
    );

    // Load initial data
    handleGridStateChange();

    return () => {
      subscription.unsubscribe();
    };
  }, [servicesManager]);

  const loadSRDataForDisplaySet = async (displaySetInstanceUID: string) => {
    if (!displaySetInstanceUID) return;

    setLoading(true);
    try {
      const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
        imageDisplaySetInstanceUID: displaySetInstanceUID,
      });

      setSRVersions(versions || []);

      if (versions?.length > 0) {
        const latestSR = versions[0];
        try {
          await commandsManager.runCommand('signalpetApplySR', {
            displaySetInstanceUID: latestSR.displaySetInstanceUID,
          });

          setSelectedSR(latestSR);
          onSRApplied?.(latestSR);

          console.log(
            '[SR Versions Hook] Automatically loaded latest SR for image:',
            displaySetInstanceUID
          );
        } catch (error) {
          console.warn('[SR Versions Hook] Failed to apply SR:', error);
        }
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

  const getCurrentDisplaySetUID = () => {
    const { viewportGridService } = servicesManager.services;
    const activeViewportId = viewportGridService.getActiveViewportId();
    return viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];
  };

  return {
    srVersions,
    selectedSR,
    loading,
    loadSRDataForDisplaySet,
    applySR,
    getCurrentDisplaySetUID,
  };
};
