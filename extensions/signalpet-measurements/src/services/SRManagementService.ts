import { SRManagementAPI, SRVersion } from '../types';

// SR SOP Class Handler IDs
const SR_SOPCLASSHANDLERID = '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr';
const SR_SOPCLASSHANDLERID_3D =
  '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr-3d';

export class SRManagementService implements SRManagementAPI {
  private servicesManager: any;
  private commandsManager: any;
  private extensionManager: any;

  constructor(servicesManager: any, commandsManager: any, extensionManager: any) {
    this.servicesManager = servicesManager;
    this.commandsManager = commandsManager;
    this.extensionManager = extensionManager;
  }

  /**
   * Requirement 1: Read and load latest SR
   * Finds and loads the most recent SR in the current study
   */
  async loadLatestSR(): Promise<SRVersion | null> {
    console.log('[SRManagement] Loading latest SR...');

    const allSRs = await this.getAllSRVersions();
    if (allSRs.length === 0) {
      console.log('[SRManagement] No SRs found');
      return null;
    }

    // Sort by date/time/series number to get latest
    const latestSR = this.sortSRsByLatest(allSRs)[0];
    console.log('[SRManagement] Found latest SR:', latestSR.displaySetInstanceUID);

    // Apply the latest SR
    return await this.applySR(latestSR.displaySetInstanceUID);
  }

  /**
   * Requirement 2: Get all SR versions
   * Returns all SR displaySets in the current study (lightweight - no loading)
   */
  async getAllSRVersions(): Promise<SRVersion[]> {
    console.log('[SRManagement] Getting all SR versions (metadata only)...');

    const { displaySetService } = this.servicesManager.services;
    const activeDisplaySets = displaySetService.getActiveDisplaySets();

    const srDisplaySets = activeDisplaySets.filter(
      ds =>
        (ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID ||
          ds.SOPClassHandlerId === SR_SOPCLASSHANDLERID_3D) &&
        ds.Modality === 'SR'
    );

    // Just return metadata without loading - for dropdown lists
    const srVersions: SRVersion[] = srDisplaySets.map(srDS => ({
      displaySetInstanceUID: srDS.displaySetInstanceUID,
      SeriesInstanceUID: srDS.SeriesInstanceUID,
      SOPInstanceUID: srDS.SOPInstanceUID,
      SeriesDate: srDS.SeriesDate,
      SeriesTime: srDS.SeriesTime,
      SeriesNumber: srDS.SeriesNumber,
      SeriesDescription: srDS.SeriesDescription,
      isLoaded: srDS.isLoaded || false,
      isHydrated: srDS.isHydrated || false,
      isRehydratable: srDS.isRehydratable || false,
      measurements: srDS.measurements || [],
      StudyInstanceUID: srDS.StudyInstanceUID,
    }));

    console.log(`[SRManagement] Found ${srVersions.length} SR versions`);
    return this.sortSRsByLatest(srVersions);
  }

  /**
   * Get SR versions that reference a specific image/series
   * Useful for per-image dropdown lists
   */
  async getSRVersionsForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion[]> {
    console.log('[SRManagement] Getting SR versions for image:', imageDisplaySetInstanceUID);

    const { displaySetService } = this.servicesManager.services;
    const imageDisplaySet = displaySetService.getDisplaySetByUID(imageDisplaySetInstanceUID);

    if (!imageDisplaySet) {
      console.warn('[SRManagement] Image displaySet not found:', imageDisplaySetInstanceUID);
      return [];
    }

    const allSRs = await this.getAllSRVersions();
    const relevantSRs: SRVersion[] = [];

    // For each SR, check if it references this image
    for (const sr of allSRs) {
      // Load SR metadata if needed to check references
      const srDisplaySet = displaySetService.getDisplaySetByUID(sr.displaySetInstanceUID);
      if (!srDisplaySet) continue;

      // If not loaded, load just the metadata (not full hydration)
      if (!srDisplaySet.isLoaded && srDisplaySet.load) {
        try {
          await srDisplaySet.load();
        } catch (error) {
          console.error(
            '[SRManagement] Failed to load SR metadata:',
            sr.displaySetInstanceUID,
            error
          );
          continue;
        }
      }

      // Check if this SR references the target image
      // Cross-reference using the correct data structures:
      // 1. SR.referencedImages[].ReferencedSOPInstanceUID should match imageDisplaySet.instances[].SOPInstanceUID
      // 2. SR.measurements[].displaySetInstanceUID should match imageDisplaySetInstanceUID
      // 3. SR.measurements[].ReferencedSOPInstanceUID should match imageDisplaySet.instances[].SOPInstanceUID

      const referencedImages = srDisplaySet.referencedImages || [];
      const measurements = srDisplaySet.measurements || [];

      // Method 1: Check if SR referencedImages contains SOPInstanceUIDs that match the image's instances
      const matchByReferencedImages = referencedImages.some(ref => {
        if (!ref.ReferencedSOPInstanceUID || !imageDisplaySet.instances) return false;
        return imageDisplaySet.instances.some(
          instance => instance.SOPInstanceUID === ref.ReferencedSOPInstanceUID
        );
      });

      // Method 2: Check if SR measurements reference this displaySet directly
      const matchByMeasurementDisplaySetUID = measurements.some(
        measurement => measurement.displaySetInstanceUID === imageDisplaySetInstanceUID
      );

      // Method 3: Check if SR measurements contain SOPInstanceUIDs that match the image's instances
      const matchByMeasurementSOPInstanceUID = measurements.some(measurement => {
        if (!measurement.ReferencedSOPInstanceUID || !imageDisplaySet.instances) return false;
        return imageDisplaySet.instances.some(
          instance => instance.SOPInstanceUID === measurement.ReferencedSOPInstanceUID
        );
      });

      const referencesThisImage =
        matchByReferencedImages ||
        matchByMeasurementDisplaySetUID ||
        matchByMeasurementSOPInstanceUID;

      console.log('[SRManagement] Match results:', {
        matchByReferencedImages,
        matchByMeasurementDisplaySetUID,
        matchByMeasurementSOPInstanceUID,
        finalResult: referencesThisImage,
      });

      if (referencesThisImage) {
        // Update the SR version with loaded status
        sr.isLoaded = srDisplaySet.isLoaded || false;
        sr.isHydrated = srDisplaySet.isHydrated || false;
        sr.isRehydratable = srDisplaySet.isRehydratable || false;
        sr.measurements = srDisplaySet.measurements || [];

        relevantSRs.push(sr);
      }
    }

    console.log(
      `[SRManagement] Found ${relevantSRs.length} SR versions for image ${imageDisplaySetInstanceUID}`
    );
    return this.sortSRsByLatest(relevantSRs);
  }

  /**
   * Requirement 3: Save SR
   * Saves current measurements as a new SR
   */
  async saveSR(description?: string): Promise<SRVersion> {
    console.log('[SRManagement] Saving current measurements as SR...');

    const { measurementService } = this.servicesManager.services;
    const measurements = measurementService.getMeasurements();

    if (!measurements || measurements.length === 0) {
      throw new Error('No measurements to save');
    }

    // Get data source for saving
    const dataSources = this.extensionManager.getDataSources();
    const dataSource = dataSources[0];

    if (!dataSource) {
      throw new Error('No data source available for saving SR');
    }

    // Prepare description for SR creation
    const srDescription = description || `SignalPET SR ${new Date().toISOString()}`;

    try {
      // Use the cornerstone-dicom-sr command to store measurements
      // measurementData should be the array directly, not wrapped in an object
      const result = await this.commandsManager.runCommand('storeMeasurements', {
        measurementData: measurements, // Pass the measurements array directly
        dataSource,
        additionalFindingTypes: [],
        options: {
          description: srDescription,
          SeriesDescription: srDescription, // DICOM series description
        },
      });

      console.log('[SRManagement] SR saved successfully:', result);

      // Wait a moment for the new SR to be added to displaySets
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return the latest SR (should be the one we just created)
      const allSRs = await this.getAllSRVersions();
      return allSRs[0]; // Latest should be first after sorting
    } catch (error) {
      console.error('[SRManagement] Failed to save SR:', error);
      throw new Error(`Failed to save SR: ${error.message}`);
    }
  }

  /**
   * Requirement 4: Apply specific SR
   * Loads and applies a specific SR by displaySetInstanceUID
   * This will REPLACE current measurements with the SR measurements
   */
  async applySR(displaySetInstanceUID: string): Promise<SRVersion> {
    console.log('[SRManagement] Applying SR:', displaySetInstanceUID);

    const { displaySetService, measurementService } = this.servicesManager.services;
    const srDisplaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

    if (!srDisplaySet) {
      throw new Error(`SR with displaySetInstanceUID ${displaySetInstanceUID} not found`);
    }

    if (srDisplaySet.Modality !== 'SR') {
      throw new Error('Selected displaySet is not an SR');
    }

    try {
      // Step 1: Clear existing measurements
      console.log('[SRManagement] Clearing existing measurements...');
      this.clearCurrentMeasurements();

      // Step 2: Load the SR if not already loaded
      if (!srDisplaySet.isLoaded && srDisplaySet.load) {
        console.log('[SRManagement] Loading SR data...');
        await srDisplaySet.load();
      }

      // Step 3: Hydrate the SR to load measurements into measurement service
      if (srDisplaySet.isRehydratable) {
        console.log('[SRManagement] Hydrating SR...');
        const result = await this.commandsManager.runCommand('hydrateStructuredReport', {
          displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
        });

        console.log('[SRManagement] SR hydrated successfully:', result);

        // Wait a moment for hydration to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 4: Direct measurements loading if hydration didn't work
      let currentMeasurements = this.getCurrentMeasurements();
      console.log(
        '[SRManagement] Measurements in service after hydration:',
        currentMeasurements.length
      );

      if (currentMeasurements.length === 0 && srDisplaySet.measurements?.length > 0) {
        console.log(
          '[SRManagement] Hydration did not load measurements, trying direct approach...'
        );

        try {
          // Try direct measurement service loading
          const { measurementService } = this.servicesManager.services;

          // Add each measurement directly to the service
          for (const measurement of srDisplaySet.measurements) {
            if (measurement.loaded && measurement.imageId) {
              try {
                console.log(
                  '[SRManagement] Adding measurement directly:',
                  measurement.TrackingIdentifier
                );

                // Create measurement object in format expected by measurement service
                const measurementToAdd = {
                  uid: measurement.TrackingUniqueIdentifier,
                  source: measurement,
                  data: measurement,
                  toolType: measurement.TrackingIdentifier?.split('@')[0] || 'Length',
                  metadata: {
                    toolName: measurement.TrackingIdentifier?.split('@')[0] || 'Length',
                    referencedImageId: measurement.imageId,
                    FrameOfReferenceUID: measurement.FrameOfReferenceUID,
                  },
                };

                measurementService.addRawMeasurement(
                  measurement.source || 'DICOM_SR',
                  measurementToAdd
                );
              } catch (measurementError) {
                console.warn(
                  '[SRManagement] Failed to add individual measurement:',
                  measurementError
                );
              }
            }
          }

          currentMeasurements = this.getCurrentMeasurements();
          console.log(
            '[SRManagement] Measurements after direct loading:',
            currentMeasurements.length
          );
        } catch (directError) {
          console.warn('[SRManagement] Direct measurement loading failed:', directError);
        }
      }

      // Step 5: Try measurement tracking if available
      try {
        await this.commandsManager.runCommand('loadTrackedSRMeasurements', {
          displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
          SeriesInstanceUID: srDisplaySet.SeriesInstanceUID,
        });
        console.log('[SRManagement] Measurement tracking initiated');
      } catch (e) {
        console.log('[SRManagement] Measurement tracking not available:', e.message);
      }

      // Step 6: Final verification
      currentMeasurements = this.getCurrentMeasurements();
      console.log('[SRManagement] Final measurements in service:', currentMeasurements.length);

      // Step 7: Ensure all loaded measurements are visible
      if (currentMeasurements.length > 0) {
        console.log('[SRManagement] Setting all measurements as visible...');
        currentMeasurements.forEach(measurement => {
          if (measurement.isVisible === undefined || measurement.isVisible === null) {
            // Update measurement to be visible
            measurementService.update(measurement.uid, { ...measurement, isVisible: true }, false);
          }
        });
        console.log('[SRManagement] All measurements set to visible');
      }

      // Return the applied SR version
      const srVersion: SRVersion = {
        displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
        SeriesInstanceUID: srDisplaySet.SeriesInstanceUID,
        SOPInstanceUID: srDisplaySet.SOPInstanceUID,
        SeriesDate: srDisplaySet.SeriesDate,
        SeriesTime: srDisplaySet.SeriesTime,
        SeriesNumber: srDisplaySet.SeriesNumber,
        SeriesDescription: srDisplaySet.SeriesDescription,
        isLoaded: srDisplaySet.isLoaded || false,
        isHydrated: srDisplaySet.isHydrated || false,
        isRehydratable: srDisplaySet.isRehydratable || false,
        measurements: srDisplaySet.measurements || [],
        StudyInstanceUID: srDisplaySet.StudyInstanceUID,
      };

      console.log('[SRManagement] Successfully applied SR:', srVersion.displaySetInstanceUID);
      console.log('[SRManagement] SR contains', srVersion.measurements.length, 'measurements');
      return srVersion;
    } catch (error) {
      console.error('[SRManagement] Failed to apply SR:', error);
      throw new Error(`Failed to apply SR: ${error.message}`);
    }
  }

  /**
   * Get current measurements from the measurement service
   */
  getCurrentMeasurements(): any[] {
    const { measurementService } = this.servicesManager.services;
    return measurementService.getMeasurements() || [];
  }

  /**
   * Clear current measurements from the measurement service
   */
  clearCurrentMeasurements(): void {
    const { measurementService } = this.servicesManager.services;
    const measurements = measurementService.getMeasurements() || [];

    // Remove each measurement
    measurements.forEach(measurement => {
      measurementService.remove(measurement.uid);
    });

    console.log('[SRManagement] Cleared all current measurements');
  }

  /**
   * Sort SRs by latest first (SeriesDate desc, SeriesTime desc, SeriesNumber desc)
   */
  private sortSRsByLatest(srs: SRVersion[]): SRVersion[] {
    return srs.sort((a, b) => {
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
      const seriesNumA = a.SeriesNumber || 0;
      const seriesNumB = b.SeriesNumber || 0;
      return seriesNumB - seriesNumA;
    });
  }
}
