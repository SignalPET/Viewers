import { Types } from '@ohif/core';
import { id } from './id.js';
import commandsModule from './commandsModule';
import panelModule from './panelModule';

const init = require('./init').default;
const { addPanelToLongitudinalMode } = require('./init');

/**
 * SignalPET Measurements Extension
 *
 * Provides comprehensive SR management functionality:
 * 1. Automatically detects and loads the latest SR
 * 2. Provides API for getting all SR versions
 * 3. Enables saving current measurements as SR
 * 4. Allows applying specific SR versions
 */

const signalPetMeasurementsExtension: Types.Extensions.Extension = {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id,

  /**
   * Initialize the extension when it's registered
   */
  preRegistration: async ({
    servicesManager,
    commandsManager,
    extensionManager,
    appConfig,
  }: Types.Extensions.ExtensionParams) => {
    await init({ servicesManager, commandsManager, extensionManager, appConfig });
  },

  /**
   * Setup event listeners when entering a mode
   */
  onModeEnter: ({
    servicesManager,
    commandsManager,
    extensionManager,
    appConfig,
  }: Types.Extensions.ExtensionParams) => {
    // Initialize the extension functionality
    init({ servicesManager, commandsManager, extensionManager, appConfig });

    // Add panel to longitudinal mode with a small delay to ensure layout is initialized
    setTimeout(() => {
      addPanelToLongitudinalMode(servicesManager);
    }, 100);
  },

  /**
   * Commands module provides the SR management API
   */
  getCommandsModule: commandsModule,

  /**
   * Panel module provides custom measurements panel with SR version dropdown
   */
  getPanelModule: panelModule,
};

export default signalPetMeasurementsExtension;

// Export types and service for external consumption
export type { SRVersion, SRManagementAPI } from './types';
