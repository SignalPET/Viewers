import { Types } from '@ohif/core';
import { SRManagementService } from './services/SRManagementService';

let viewportsReadySubscription = null;
let gridStateSubscription = null;
let activeViewportSubscription = null;
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
    if (viewportsReadySubscription) {
      viewportsReadySubscription.unsubscribe();
      viewportsReadySubscription = null;
    }
    if (gridStateSubscription) {
      gridStateSubscription.unsubscribe();
      gridStateSubscription = null;
    }
    if (activeViewportSubscription) {
      activeViewportSubscription.unsubscribe();
      activeViewportSubscription = null;
    }
  }

  console.log('[SignalPET Measurements] Initializing extension...');

  const { viewportGridService } = servicesManager.services;

  // Function to set up grid state subscription (only called after viewport is ready)
  const setupGridStateSubscription = () => {
    if (gridStateSubscription) {
      return; // Already set up
    }

    console.log('[SignalPET Measurements] Setting up grid state subscription after viewport ready');
    gridStateSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.GRID_STATE_CHANGED,
      handleGridStateChange
    );
  };

  // Function to set up active viewport subscription (only called after viewport is ready)
  const setupActiveViewportSubscription = () => {
    if (activeViewportSubscription) {
      return; // Already set up
    }

    console.log(
      '[SignalPET Measurements] Setting up active viewport subscription after viewport ready'
    );
    activeViewportSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
      handleActiveViewportChange
    );
  };

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

  // Function to handle active viewport changes (when user focuses on different viewport)
  const handleActiveViewportChange = ({ viewportId }) => {
    const displaySetInstanceUID =
      viewportGridService.getDisplaySetsUIDsForViewport(viewportId)?.[0];

    if (displaySetInstanceUID) {
      console.log(
        '[SignalPET Measurements] Active viewport changed to:',
        viewportId,
        'auto-loading SR for image:',
        displaySetInstanceUID
      );
      autoLoadLatestSRForCurrentImage(servicesManager, commandsManager, extensionManager);
    }
  };

  // Function to handle when viewports are ready (replaces manual readiness checking)
  const handleViewportsReady = () => {
    console.log('[SignalPET Measurements] Viewports are ready - setting up subscriptions');

    // Load SR for the current active viewport
    const activeViewportId = viewportGridService.getActiveViewportId();
    if (activeViewportId) {
      const displaySetInstanceUID =
        viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];

      if (displaySetInstanceUID) {
        console.log(
          '[SignalPET Measurements] Auto-loading SR for ready viewport:',
          displaySetInstanceUID
        );

        autoLoadLatestSRForCurrentImage(servicesManager, commandsManager, extensionManager);
      }
    }

    // Set up both subscriptions now that viewports are ready
    setupGridStateSubscription();
    setupActiveViewportSubscription();
  };

  // Listen for viewports ready event (initial setup)
  viewportsReadySubscription = viewportGridService.subscribe(
    viewportGridService.EVENTS.VIEWPORTS_READY,
    handleViewportsReady
  );

  isInitialized = true;
  console.log('[SignalPET Measurements] Extension initialized successfully');
}

/**
 * Clean panel modification that waits for proper timing
 */
export function setupPanelCustomization(servicesManager: AppTypes.ServicesManager) {
  const { panelService, viewportGridService } = servicesManager.services;

  // Check if we're in the longitudinal mode route
  const currentPath = window.location.pathname;
  const isLongitudinalMode =
    currentPath.includes('/viewer') || currentPath.includes('/longitudinal');

  if (!isLongitudinalMode) {
    console.log('[SignalPET Measurements] Not in longitudinal mode, skipping panel customization');
    return;
  }

  // Wait for viewports to be fully ready before modifying panels
  const subscription = viewportGridService.subscribe(
    viewportGridService.EVENTS.VIEWPORTS_READY,
    () => {
      try {
        console.log('[SignalPET Measurements] Viewports ready, customizing panels...');

        // Get current panels and filter out unwanted ones
        const currentRightPanels = panelService.getPanels(panelService.PanelPosition.Right);
        const filteredRightPanels = currentRightPanels.filter(
          panel =>
            panel.id !== '@ohif/extension-cornerstone.panelModule.panelSegmentation' &&
            panel.id !== '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements'
        );

        // Add our SignalPET measurements panel
        const customRightPanels = [
          ...filteredRightPanels,
          {
            id: '@signalpet/extension-signalpet-measurements.panelModule.trackedMeasurements',
            // Add any other panel properties if needed
          },
        ];

        // Apply the panel configuration
        panelService.setPanels(
          {
            left: panelService.getPanels(panelService.PanelPosition.Left).map(p => p.id),
            right: customRightPanels.map(p => p.id),
            bottom: panelService.getPanels(panelService.PanelPosition.Bottom).map(p => p.id),
          },
          { rightPanelClosed: false }
        );

        console.log('[SignalPET Measurements] Successfully customized panels after viewport ready');
      } catch (error) {
        console.error('[SignalPET Measurements] Error customizing panels:', error);
      }

      // Clean up the subscription
      subscription.unsubscribe();
    }
  );
}
