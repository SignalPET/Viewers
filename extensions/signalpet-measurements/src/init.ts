import { Types } from '@ohif/core';
import { SRManagementService } from './services/SRManagementService';

let subscriptions = [];
let isInitialized = false;

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
    const { viewportGridService, measurementService } = servicesManager.services;
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

    // Clear existing measurements before loading new ones to prevent duplicates
    measurementService.clearMeasurements();
    console.log('[SignalPET Measurements] Cleared existing measurements');

    const srService = new SRManagementService(servicesManager, commandsManager, extensionManager);

    const versions = await srService.getSRVersionsForImage(activeDisplaySetInstanceUID);
    if (versions?.length > 0) {
      await srService.applySR(versions[0].displaySetInstanceUID);
      console.log(
        '[SignalPET Measurements] Successfully auto-loaded SR for image:',
        versions[0].displaySetInstanceUID
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

  const { viewportGridService } = servicesManager.services;

  // Function to handle grid state changes (when user switches images)
  const handleGridStateChange = () => {
    const activeViewportId = viewportGridService.getActiveViewportId();
    const displaySetInstanceUID =
      viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];

    if (displaySetInstanceUID) {
      console.log(
        '[SignalPET Measurements] Grid state changed, auto-loading SR for image:',
        displaySetInstanceUID
      );
      autoLoadLatestSRForCurrentImage(servicesManager, commandsManager, extensionManager);
    }
  };

  // Listen for grid state changes (when displaySets change in viewports or user switches images)
  const gridStateChangeSubscription = viewportGridService.subscribe(
    viewportGridService.EVENTS.GRID_STATE_CHANGED,
    handleGridStateChange
  );

  const viewportReadySubscription = viewportGridService.subscribe(
    viewportGridService.EVENTS.VIEWPORTS_READY,
    handleGridStateChange
  );

  subscriptions = [gridStateChangeSubscription, viewportReadySubscription];

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
