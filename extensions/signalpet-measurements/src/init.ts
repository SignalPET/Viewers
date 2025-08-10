import { Types } from '@ohif/core';
import { SRManagementService } from './services/SRManagementService';

let subscriptions = [];
let isInitialized = false;

// SR SOP Class Handler IDs - must match the actual IDs from cornerstone-dicom-sr extension
const SR_SOPCLASSHANDLERID = '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr';
const SR_SOPCLASSHANDLERID_3D =
  '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr-3d';

/**
 * Attempts to automatically load the latest SR for the current image using SRManagementService
 */
async function autoLoadLatestSRForCurrentImage(
  servicesManager: AppTypes.ServicesManager,
  commandsManager: AppTypes.CommandsManager,
  extensionManager: AppTypes.ExtensionManager
) {
  try {
    console.log(
      '[SignalPET Measurements] Checking for latest SR to auto-load for current image...'
    );

    // Get the current active viewport to determine the active image
    const { viewportGridService } = servicesManager.services;
    const activeViewportId = viewportGridService.getActiveViewportId();

    if (!activeViewportId) {
      console.log('[SignalPET Measurements] No active viewport found');
      return;
    }

    const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId);
    const activeDisplaySetInstanceUID = displaySetUIDs?.[0];

    if (!activeDisplaySetInstanceUID) {
      console.log('[SignalPET Measurements] No active image display set found');
      return;
    }

    console.log('[SignalPET Measurements] Active image display set:', activeDisplaySetInstanceUID);

    const srService = new SRManagementService(servicesManager, commandsManager, extensionManager);

    const appliedSR = await srService.applyLatestSRForImage(activeDisplaySetInstanceUID);

    if (appliedSR) {
      console.log(
        '[SignalPET Measurements] Successfully auto-loaded SR for image:',
        appliedSR.displaySetInstanceUID
      );
    } else {
      console.log(
        '[SignalPET Measurements] No SR found for current image:',
        activeDisplaySetInstanceUID
      );
    }
  } catch (error) {
    console.error('[SignalPET Measurements] Error during auto-load:', error);
  }
}

/**
 * Initialize the SignalPET Measurements extension
 */
export default async function init({
  servicesManager,
  commandsManager,
  extensionManager,
}: Types.Extensions.ExtensionParams) {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('[SignalPET Measurements] Already initialized, cleaning up previous subscriptions');
    subscriptions.forEach(sub => sub.unsubscribe());
    subscriptions = [];
  }

  console.log('[SignalPET Measurements] Initializing extension...');

  const { displaySetService, viewportGridService } = servicesManager.services;

  // Listen for displaySets being added to detect new SRs
  const displaySetsAddedSubscription = displaySetService.subscribe(
    displaySetService.EVENTS.DISPLAY_SETS_ADDED,
    async ({ displaySetsAdded }) => {
      console.log('[SignalPET Measurements] DisplaySets added, checking for SRs...');

      // Check if any of the added displaySets are SRs
      const newSRs = displaySetsAdded.filter(
        ds =>
          (ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID ||
            ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID_3D) &&
          ds.Modality === 'SR'
      );

      if (newSRs.length > 0) {
        console.log(
          `[SignalPET Measurements] Found ${newSRs.length} new SR(s), triggering auto-load check`
        );

        // Small delay to ensure all displaySets are properly added
        setTimeout(() => {
          autoLoadLatestSRForCurrentImage(servicesManager, commandsManager, extensionManager);
        }, 500);
      }
    }
  );

  // Listen for displaySets changing (e.g., when study is fully loaded)
  const displaySetsChangedSubscription = displaySetService.subscribe(
    displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
    async activeDisplaySets => {
      console.log(
        '[SignalPET Measurements] DisplaySets changed, checking for auto-load opportunity...'
      );

      // Check if we have any SRs and if auto-loading hasn't been attempted yet
      const hasUnprocessedSRs = activeDisplaySets.some(
        ds =>
          (ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID ||
            ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID_3D) &&
          ds.Modality === 'SR' &&
          ds.isRehydratable === true &&
          !ds.isHydrated
      );

      if (hasUnprocessedSRs) {
        console.log('[SignalPET Measurements] Found unprocessed SRs, attempting auto-load...');
        // Small delay to ensure everything is settled
        setTimeout(() => {
          autoLoadLatestSRForCurrentImage(servicesManager, commandsManager, extensionManager);
        }, 1000);
      }
    }
  );

  // Listen for viewports being ready (initial study load)
  const viewportsReadySubscription = viewportGridService.subscribe(
    viewportGridService.EVENTS.VIEWPORTS_READY,
    () => {
      console.log('[SignalPET Measurements] Viewports ready, checking for initial auto-load...');
      // Delay to ensure displaySets are fully processed
      setTimeout(() => {
        autoLoadLatestSRForCurrentImage(servicesManager, commandsManager, extensionManager);
      }, 2000);
    }
  );

  subscriptions = [
    displaySetsAddedSubscription,
    displaySetsChangedSubscription,
    viewportsReadySubscription,
  ];

  isInitialized = true;
  console.log('[SignalPET Measurements] Extension initialized successfully');
}

/**
 * Adds SignalPET measurements panel to longitudinal mode and removes default measurement tracking panel
 */
export function addPanelToLongitudinalMode(servicesManager: AppTypes.ServicesManager) {
  const { panelService } = servicesManager.services;

  // Check if we're in the longitudinal mode route
  const currentPath = window.location.pathname;
  const isLongitudinalMode =
    currentPath.includes('/viewer') || currentPath.includes('/longitudinal');

  if (!isLongitudinalMode) {
    console.log('[SignalPET Measurements] Not in longitudinal mode, skipping panel modification');
    return;
  }

  try {
    console.log('[SignalPET Measurements] Modifying panels for longitudinal mode...');

    // Get current panels from all positions
    const currentLeftPanels = panelService.getPanels(panelService.PanelPosition.Left);
    const currentRightPanels = panelService.getPanels(panelService.PanelPosition.Right);

    console.log(
      '[SignalPET Measurements] Current left panels:',
      currentLeftPanels.map(p => p.id)
    );
    console.log(
      '[SignalPET Measurements] Current right panels:',
      currentRightPanels.map(p => p.id)
    );

    // Define the desired panel configuration
    const leftPanelIds = currentLeftPanels.map(p => p.id); // Keep existing left panels

    // For right panels: keep segmentation panel but replace measurement tracking with ours
    const rightPanelIds = currentRightPanels
      .filter(
        panel =>
          // Keep segmentation panel, exclude measurement tracking panel
          panel.id === '@ohif/extension-cornerstone.panelModule.panelSegmentation'
      )
      .map(p => p.id);

    // Add our SignalPET measurements panel
    rightPanelIds.push(
      '@signalpet/extension-signalpet-measurements.panelModule.trackedMeasurements'
    );

    console.log('[SignalPET Measurements] Setting new panel configuration:');
    console.log('- Left panels:', leftPanelIds);
    console.log('- Right panels:', rightPanelIds);

    // Get current bottom panels to preserve them
    const currentBottomPanels = panelService.getPanels(panelService.PanelPosition.Bottom);
    const bottomPanelIds = currentBottomPanels.map(p => p.id);

    // Set the new panel configuration
    panelService.setPanels(
      {
        left: leftPanelIds,
        right: rightPanelIds,
        bottom: bottomPanelIds,
      },
      { rightPanelClosed: false }
    );

    console.log(
      '[SignalPET Measurements] Successfully modified panels - removed measurement tracking panel and added SignalPET measurements panel'
    );
  } catch (error) {
    console.error('[SignalPET Measurements] Error modifying panels:', error);
  }
}
