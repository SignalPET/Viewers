import { Types } from '@ohif/core';
import { SRManagementService, SRSelectionService, type SRSelectionEventData } from './services';

let viewportsReadySubscription = null;
let gridStateSubscription = null;

let layoutChangeSubscription = null;
let srSelectionSubscription = null;
let isInitialized = false;
let isAutoLoadingInProgress = false;

async function autoLoadSRsForCurrentLayout(
  servicesManager: AppTypes.ServicesManager,
  commandsManager: AppTypes.CommandsManager,
  extensionManager: AppTypes.ExtensionManager
) {
  // Prevent concurrent/duplicate loading
  if (isAutoLoadingInProgress) {
    console.log('[SignalPET Measurements] Auto-loading already in progress, skipping...');
    return;
  }

  isAutoLoadingInProgress = true;
  try {
    console.log('[SignalPET Measurements] Auto-loading SRs for current layout...');

    const { viewportGridService, measurementService } = servicesManager.services;
    const state = viewportGridService.getState();

    // Detect layout type
    const numViewports = state.layout.numRows * state.layout.numCols;
    const isMultiImage = numViewports > 1;

    console.log(
      `[SignalPET Measurements] Layout: ${isMultiImage ? 'multi-image' : 'single-image'} (${numViewports} viewports)`
    );

    // Get all currently displayed images
    const allDisplaySets: string[] = [];
    state.viewports.forEach((viewport: any) => {
      if (viewport.displaySetInstanceUIDs?.length > 0) {
        allDisplaySets.push(...viewport.displaySetInstanceUIDs);
      }
    });

    // Remove duplicates
    const uniqueDisplaySets = [...new Set(allDisplaySets)];

    if (uniqueDisplaySets.length === 0) {
      console.log('[SignalPET Measurements] No display sets found');
      return;
    }

    console.log(
      `[SignalPET Measurements] Found ${uniqueDisplaySets.length} unique images:`,
      uniqueDisplaySets
    );

    // Clear existing measurements to prevent conflicts
    measurementService.clearMeasurements();
    console.log('[SignalPET Measurements] Cleared existing measurements');

    const srService = new SRManagementService(servicesManager, commandsManager, extensionManager);

    // Collect all unique SRs for all displayed images
    const uniqueSRsToLoad = new Set<string>();
    const imageToSRMapping: { [imageUID: string]: string } = {};

    for (const displaySetInstanceUID of uniqueDisplaySets) {
      try {
        const versions = await srService.getSRVersionsForImage(displaySetInstanceUID);
        if (versions?.length > 0) {
          const latestSR = versions[0].displaySetInstanceUID;
          uniqueSRsToLoad.add(latestSR);
          imageToSRMapping[displaySetInstanceUID] = latestSR;
          console.log(
            `[SignalPET Measurements] Found SR for ${displaySetInstanceUID} -> ${latestSR}`
          );
        } else {
          console.log(`[SignalPET Measurements] No SR found for image: ${displaySetInstanceUID}`);
        }
      } catch (error) {
        console.error(
          `[SignalPET Measurements] ❌ Failed to get SR versions for image ${displaySetInstanceUID}:`,
          error
        );
      }
    }

    // Load each unique SR only once
    console.log(`[SignalPET Measurements] Loading ${uniqueSRsToLoad.size} unique SRs...`);
    for (const srDisplaySetInstanceUID of uniqueSRsToLoad) {
      try {
        await srService.applySR(srDisplaySetInstanceUID);
        console.log('[SignalPET Measurements] ✅ Auto-loaded unique SR:', srDisplaySetInstanceUID);
      } catch (error) {
        console.error(
          `[SignalPET Measurements] ❌ Failed to load SR ${srDisplaySetInstanceUID}:`,
          error
        );
      }
    }

    console.log('[SignalPET Measurements] Image to SR mapping:', imageToSRMapping);

    console.log('[SignalPET Measurements] Auto-loading complete');
  } catch (error) {
    console.error('[SignalPET Measurements] Error during auto-load:', error);
  } finally {
    isAutoLoadingInProgress = false;
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

    if (layoutChangeSubscription) {
      layoutChangeSubscription.unsubscribe();
      layoutChangeSubscription = null;
    }
    if (srSelectionSubscription) {
      srSelectionSubscription.unsubscribe();
      srSelectionSubscription = null;
    }
  }

  console.log('[SignalPET Measurements] Initializing extension...');

  // Register SRSelectionService as a singleton
  if (!servicesManager.services.srSelectionService) {
    console.log('[SignalPET Measurements] Registering SRSelectionService...');
    servicesManager.registerService(SRSelectionService.REGISTRATION);
  }

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

  const handleLayoutChange = data => {
    console.log('[SignalPET Measurements] Layout changed:', data);
    // Cleanup measurements when layout changes (e.g., 4x1 -> 2x2)
    try {
      commandsManager.runCommand('signalpetCleanupMeasurements');
    } catch (error) {
      console.error(
        '[SignalPET Measurements] Failed to cleanup measurements on layout change:',
        error
      );
    }

    // Auto-load SRs for new layout
    setTimeout(() => {
      console.log('[SignalPET Measurements] Layout changed, auto-loading SRs...');
      autoLoadSRsForCurrentLayout(servicesManager, commandsManager, extensionManager);
    }, 100); // Small delay to ensure layout is fully updated
  };

  // Function to set up layout change subscription (only called after viewport is ready)
  const setupLayoutChangeSubscription = () => {
    if (layoutChangeSubscription) {
      return; // Already set up
    }

    console.log(
      '[SignalPET Measurements] Setting up layout change subscription after viewport ready'
    );
    layoutChangeSubscription = viewportGridService.subscribe(
      viewportGridService.EVENTS.LAYOUT_CHANGED,
      handleLayoutChange
    );
  };

  // Function to handle user SR selection events
  const handleSRSelectionEvent = async (data: SRSelectionEventData) => {
    console.log('[SignalPET Measurements] User selected SR:', data);

    // Clear measurements for the specific target image (if provided)
    if (data.targetImageDisplaySetUID) {
      try {
        commandsManager.runCommand('signalpetClearMeasurementsForImage', {
          imageDisplaySetInstanceUID: data.targetImageDisplaySetUID,
        });
        console.log(
          `[SignalPET Measurements] Cleared measurements for target image: ${data.targetImageDisplaySetUID}`
        );
      } catch (error) {
        console.error(
          '[SignalPET Measurements] Failed to clear measurements for target image:',
          error
        );
      }
    }

    // Also cleanup measurements for images no longer displayed
    try {
      commandsManager.runCommand('signalpetCleanupMeasurements');
    } catch (error) {
      console.error(
        '[SignalPET Measurements] Failed to cleanup measurements on SR selection:',
        error
      );
    }

    // Apply the selected SR
    try {
      await commandsManager.runCommand('signalpetApplySR', {
        displaySetInstanceUID: data.displaySetInstanceUID,
      });
      console.log(
        '[SignalPET Measurements] Successfully applied user-selected SR:',
        data.displaySetInstanceUID
      );
    } catch (error) {
      console.error('[SignalPET Measurements] Failed to apply user-selected SR:', error);
    }
  };

  // Function to set up SR selection event subscription (OHIF-style)
  const setupSRSelectionSubscription = () => {
    if (srSelectionSubscription) {
      return; // Already set up
    }

    console.log('[SignalPET Measurements] Setting up OHIF-style SR selection subscription');
    const { srSelectionService } = servicesManager.services;
    srSelectionSubscription = srSelectionService.subscribe(
      SRSelectionService.EVENTS.SR_SELECTION_REQUESTED,
      handleSRSelectionEvent
    );
  };

  // Function to handle grid state changes (when user switches images)
  const handleGridStateChange = () => {
    // First cleanup measurements for images no longer displayed
    console.log('[SignalPET Measurements] Grid state changed, cleaning up measurements...');
    try {
      commandsManager.runCommand('signalpetCleanupMeasurements');
    } catch (error) {
      console.error('[SignalPET Measurements] Failed to cleanup measurements:', error);
    }

    // Auto-load SRs for current layout after grid state change
    console.log('[SignalPET Measurements] Grid state changed, auto-loading SRs...');
    autoLoadSRsForCurrentLayout(servicesManager, commandsManager, extensionManager);
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
          '[SignalPET Measurements] Viewports ready, auto-loading SRs for current layout...'
        );
        autoLoadSRsForCurrentLayout(servicesManager, commandsManager, extensionManager);
      }
    }

    // Set up all subscriptions now that viewports are ready
    setupGridStateSubscription();
    setupLayoutChangeSubscription();
    setupSRSelectionSubscription();
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
