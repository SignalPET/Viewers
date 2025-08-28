import { SRManagementService } from './services/SRManagementService';
import { SRVersion } from './types';

let srManagementService: SRManagementService | null = null;

const commandsModule = ({ servicesManager, commandsManager, extensionManager }) => {
  // Initialize the SR management service
  if (!srManagementService) {
    srManagementService = new SRManagementService(
      servicesManager,
      commandsManager,
      extensionManager
    );
  }

  const actions = {
    /**
     * Get SR versions for a specific image (for per-image dropdowns)
     * Usage: commandsManager.runCommand('signalpetGetSRVersionsForImage', { imageDisplaySetInstanceUID: 'uid123' })
     */
    signalpetGetSRVersionsForImage: async ({
      imageDisplaySetInstanceUID,
    }: {
      imageDisplaySetInstanceUID: string;
    }): Promise<SRVersion[]> => {
      return await srManagementService.getSRVersionsForImage(imageDisplaySetInstanceUID);
    },

    /**
     * Save SR for specific image display set
     * Usage: commandsManager.runCommand('signalpetSaveSR', { imageDisplaySetInstanceUID: 'required-image-uid' })
     */
    signalpetSaveSR: async ({
      imageDisplaySetInstanceUID,
    }: {
      imageDisplaySetInstanceUID: string;
    }): Promise<void> => {
      return await srManagementService.saveSR(imageDisplaySetInstanceUID);
    },

    /**
     * Apply specific SR
     * Usage: commandsManager.runCommand('signalpetApplySR', { displaySetInstanceUID: 'uid123' })
     */
    signalpetApplySR: async ({
      displaySetInstanceUID,
    }: {
      displaySetInstanceUID: string;
    }): Promise<void> => {
      return await srManagementService.applySR(displaySetInstanceUID);
    },

    /**
     * Get current measurements
     * Usage: commandsManager.runCommand('signalpetGetCurrentMeasurements')
     */
    signalpetGetCurrentMeasurements: (): any[] => {
      return srManagementService.getCurrentMeasurements();
    },

    /**
     * Clear measurements for images not currently displayed
     * Usage: commandsManager.runCommand('signalpetCleanupMeasurements')
     */
    signalpetCleanupMeasurements: (): void => {
      return srManagementService.clearMeasurementsNotInCurrentDisplay();
    },

    /**
     * Clear measurements for a specific image (used when switching SR versions)
     * Usage: commandsManager.runCommand('signalpetClearMeasurementsForImage', { imageDisplaySetInstanceUID: 'uid123' })
     */
    signalpetClearMeasurementsForImage: ({
      imageDisplaySetInstanceUID,
    }: {
      imageDisplaySetInstanceUID: string;
    }): void => {
      return srManagementService.clearMeasurementsForImage(imageDisplaySetInstanceUID);
    },

    /**
     * Get the SR management service instance for direct access
     * Usage: const service = commandsManager.runCommand('signalpetGetSRService')
     */
    signalpetGetSRService: (): SRManagementService => {
      return srManagementService;
    },
  };

  const definitions = {
    signalpetGetSRVersionsForImage: {
      commandFn: actions.signalpetGetSRVersionsForImage,
    },
    signalpetSaveSR: {
      commandFn: actions.signalpetSaveSR,
    },
    signalpetApplySR: {
      commandFn: actions.signalpetApplySR,
    },
    signalpetGetCurrentMeasurements: {
      commandFn: actions.signalpetGetCurrentMeasurements,
    },
    signalpetCleanupMeasurements: {
      commandFn: actions.signalpetCleanupMeasurements,
    },
    signalpetClearMeasurementsForImage: {
      commandFn: actions.signalpetClearMeasurementsForImage,
    },
    signalpetGetSRService: {
      commandFn: actions.signalpetGetSRService,
    },
  };

  return {
    actions,
    definitions,
    defaultContext: 'ACTIVE_VIEWPORT:SIGNALPET_SR',
  };
};

export default commandsModule;
