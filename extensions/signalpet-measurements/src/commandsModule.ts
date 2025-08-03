import { SRManagementService, SRVersion } from './services/SRManagementService';

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
     * Requirement 1: Read and load latest SR
     * Usage: commandsManager.runCommand('signalpetLoadLatestSR')
     */
    signalpetLoadLatestSR: async (): Promise<SRVersion | null> => {
      return await srManagementService.loadLatestSR();
    },

    /**
     * Requirement 2: Get all SR versions
     * Usage: commandsManager.runCommand('signalpetGetAllSRVersions')
     */
    signalpetGetAllSRVersions: async (): Promise<SRVersion[]> => {
      return await srManagementService.getAllSRVersions();
    },

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
     * Requirement 3: Save SR
     * Usage: commandsManager.runCommand('signalpetSaveSR', { description: 'My SR Description' })
     */
    signalpetSaveSR: async ({ description }: { description?: string }): Promise<SRVersion> => {
      return await srManagementService.saveSR(description);
    },

    /**
     * Requirement 4: Apply specific SR
     * Usage: commandsManager.runCommand('signalpetApplySR', { displaySetInstanceUID: 'uid123' })
     */
    signalpetApplySR: async ({
      displaySetInstanceUID,
    }: {
      displaySetInstanceUID: string;
    }): Promise<SRVersion> => {
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
     * Clear current measurements
     * Usage: commandsManager.runCommand('signalpetClearCurrentMeasurements')
     */
    signalpetClearCurrentMeasurements: (): void => {
      return srManagementService.clearCurrentMeasurements();
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
    signalpetLoadLatestSR: {
      commandFn: actions.signalpetLoadLatestSR,
    },
    signalpetGetAllSRVersions: {
      commandFn: actions.signalpetGetAllSRVersions,
    },
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
    signalpetClearCurrentMeasurements: {
      commandFn: actions.signalpetClearCurrentMeasurements,
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
