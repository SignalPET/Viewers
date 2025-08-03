import { Types } from '@ohif/core';

// Use any for now to avoid type issues
type AppTypes = any;

let subscriptions = [];
let isInitialized = false;

// SR SOP Class Handler IDs - must match the actual IDs from cornerstone-dicom-sr extension
const SR_SOPCLASSHANDLERID = '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr';
const SR_SOPCLASSHANDLERID_3D =
  '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr-3d';

/**
 * Finds the latest SR displaySet based on SeriesDate, SeriesTime, and SeriesNumber
 */
function findLatestSR(displaySets: any[]): any | null {
  const srDisplaySets = displaySets.filter(
    ds =>
      (ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID ||
        ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID_3D) &&
      ds.Modality === 'SR'
  );

  if (srDisplaySets.length === 0) {
    return null;
  }

  // Sort by SeriesDate desc, then SeriesTime desc, then SeriesNumber desc
  const sortedSRs = srDisplaySets.sort((a, b) => {
    // Compare SeriesDate first
    const dateA = a.SeriesDate || '';
    const dateB = b.SeriesDate || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    // If dates are same, compare SeriesTime
    const timeA = a.SeriesTime || '';
    const timeB = b.SeriesTime || '';
    if (timeA !== timeB) {
      return timeB.localeCompare(timeA);
    }

    // If dates and times are same, compare SeriesNumber
    const seriesNumA = parseInt(String(a.SeriesNumber || '0'));
    const seriesNumB = parseInt(String(b.SeriesNumber || '0'));
    return seriesNumB - seriesNumA;
  });

  return sortedSRs[0];
}

/**
 * Attempts to automatically load the latest SR
 */
async function autoLoadLatestSR(
  servicesManager: AppTypes.ServicesManager,
  commandsManager: AppTypes.CommandsManager,
  extensionManager: AppTypes.ExtensionManager
) {
  const { displaySetService, customizationService } = servicesManager.services;

  try {
    console.log('[SignalPET Measurements] Checking for latest SR to auto-load...');

    const activeDisplaySets = displaySetService.getActiveDisplaySets();
    const latestSR = findLatestSR(activeDisplaySets);

    if (!latestSR) {
      console.log('[SignalPET Measurements] No SR displaySets found');
      return;
    }

    console.log('[SignalPET Measurements] Found latest SR:', {
      displaySetInstanceUID: latestSR.displaySetInstanceUID,
      SeriesDate: latestSR.SeriesDate,
      SeriesTime: latestSR.SeriesTime,
      SeriesNumber: latestSR.SeriesNumber,
      SeriesDescription: latestSR.SeriesDescription,
    });

    // Load the SR if not already loaded
    if (!latestSR.isLoaded && latestSR.load) {
      console.log('[SignalPET Measurements] Loading SR data...');
      await latestSR.load();
    }

    // Check if it's rehydratable
    if (latestSR.isRehydratable === true && !latestSR.isHydrated) {
      console.log('[SignalPET Measurements] SR is rehydratable, triggering auto-hydration...');

      // Check if auto-hydration is enabled (bypass confirmation prompts)
      const disableConfirmationPrompts = customizationService.getCustomization(
        'disableConfirmationPrompts'
      );

      // Auto-hydrate by default unless explicitly disabled
      if (true) {
        // Directly hydrate the SR using the cornerstone-dicom-sr command
        const result = await commandsManager.runCommand('hydrateStructuredReport', {
          displaySetInstanceUID: latestSR.displaySetInstanceUID,
        });

        console.log('[SignalPET Measurements] SR auto-hydration completed:', result);

        // Optionally trigger measurement tracking if available
        try {
          await commandsManager.runCommand('loadTrackedSRMeasurements', {
            displaySetInstanceUID: latestSR.displaySetInstanceUID,
            SeriesInstanceUID: latestSR.SeriesInstanceUID,
          });
          console.log('[SignalPET Measurements] Measurement tracking initiated');
        } catch (e) {
          // Command may not be available, that's okay
          console.log('[SignalPET Measurements] Measurement tracking command not available');
        }
      } else {
        console.log('[SignalPET Measurements] Auto-hydration disabled by configuration');
      }
    } else if (latestSR.isHydrated) {
      console.log('[SignalPET Measurements] SR is already hydrated');
    } else {
      console.log('[SignalPET Measurements] SR is not rehydratable');
    }
  } catch (error) {
    console.error('[SignalPET Measurements] Error during auto-hydration:', error);
  }
}

/**
 * Initialize the SignalPET Measurements extension
 */
export default async function init({
  servicesManager,
  commandsManager,
  extensionManager,
  appConfig,
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
          autoLoadLatestSR(servicesManager, commandsManager, extensionManager);
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
          autoLoadLatestSR(servicesManager, commandsManager, extensionManager);
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
        autoLoadLatestSR(servicesManager, commandsManager, extensionManager);
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
