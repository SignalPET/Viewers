import { Types } from '@ohif/core';
import { backOff } from 'exponential-backoff';
import { SRManagementAPI, SRVersion, SRDisplaySet, Measurement } from '../types';
import { checkTargetImagesReady, getMeasurementsForDisplaySet } from '../utils';

export class SRManagementService implements SRManagementAPI {
  constructor(
    private readonly servicesManager: AppTypes.ServicesManager,
    private readonly commandsManager: AppTypes.CommandsManager,
    private readonly extensionManager: AppTypes.ExtensionManager
  ) {}

  /**
   * Get SR versions that reference a specific image by SOP Instance UID
   */
  async getSRVersionsForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion[]> {
    console.log('[SRManagement] Getting SR versions for image:', imageDisplaySetInstanceUID);

    const imageDisplaySet = this.servicesManager.services.displaySetService.getDisplaySetByUID(
      imageDisplaySetInstanceUID
    ) as Types.DisplaySet;

    if (!imageDisplaySet?.instances) {
      console.warn(
        '[SRManagement] Image displaySet not found or has no instances:',
        imageDisplaySetInstanceUID
      );
      return [];
    }

    const imageSOPInstanceUIDs = imageDisplaySet.instances.map(instance => instance.SOPInstanceUID);
    console.log(
      '[SRManagement] Looking for SRs referencing SOP Instance UIDs:',
      imageSOPInstanceUIDs
    );

    const allSRs = this.getAllSRDisplaySets();
    const relevantSRs: SRVersion[] = [];

    for (const sr of allSRs) {
      if (this.doesSRReferenceImageSOPs(sr, imageSOPInstanceUIDs)) {
        relevantSRs.push(this.createSRVersionFromDisplaySet(sr));
      }
    }

    console.log(
      `[SRManagement] Found ${relevantSRs.length} SR versions for image ${imageDisplaySetInstanceUID}`
    );
    return this.sortSRsByLatest(relevantSRs);
  }

  /**
   * Save SR for specific image display set
   */
  async saveSR(imageDisplaySetInstanceUID: string): Promise<void> {
    console.log(
      '[SRManagement] Saving current measurements as SR for image:',
      imageDisplaySetInstanceUID
    );

    if (!imageDisplaySetInstanceUID) {
      throw new Error('Image display set instance UID is required for saving SR');
    }

    // Filter measurements to only include those for the specific image/display set
    const measurements = getMeasurementsForDisplaySet(
      this.servicesManager.services.measurementService,
      imageDisplaySetInstanceUID
    );

    if (measurements.length === 0) {
      throw new Error('No measurements to save for this image');
    }

    console.log(
      `[SRManagement] Found ${measurements.length} measurements for image ${imageDisplaySetInstanceUID}`
    );

    const dataSource = this.getDataSource();
    const srDescription = this.createSRDescription();
    const timestamp = new Date().toISOString();

    try {
      const naturalizedReport = await this.storeMeasurementsAsSR(
        measurements,
        dataSource,
        srDescription,
        imageDisplaySetInstanceUID,
        timestamp
      );

      console.log(
        '[SRManagement] SR saved successfully for image:',
        imageDisplaySetInstanceUID,
        naturalizedReport
      );
    } catch (error) {
      console.error('[SRManagement] Failed to save SR:', error);
      throw new Error(`Failed to save SR: ${(error as Error).message}`);
    }
  }

  /**
   * Apply specific SR
   */
  async applySR(displaySetInstanceUID: string): Promise<void> {
    console.log('[SRManagement] Applying SR:', displaySetInstanceUID);

    const srDisplaySet = this.servicesManager.services.displaySetService.getDisplaySetByUID(
      displaySetInstanceUID
    ) as SRDisplaySet;

    if (!srDisplaySet) {
      throw new Error(`SR with displaySetInstanceUID ${displaySetInstanceUID} not found`);
    }

    if (srDisplaySet.Modality !== 'SR') {
      throw new Error('Selected displaySet is not an SR');
    }

    try {
      await this.hydrateSR(srDisplaySet);

      const measurements = this.getCurrentMeasurements();
      this.ensureMeasurementsVisible(measurements);

      console.log('[SRManagement] Successfully applied SR:', srDisplaySet.displaySetInstanceUID);
      console.log('[SRManagement] SR contains', measurements.length, 'measurements');
    } catch (error) {
      console.error('[SRManagement] Failed to apply SR:', error);
      throw new Error(`Failed to apply SR: ${(error as Error).message}`);
    }
  }

  /**
   * Get current measurements from the measurement service
   */
  getCurrentMeasurements(): Measurement[] {
    return this.servicesManager.services.measurementService.getMeasurements() || [];
  }

  /**
   * Get all currently displayed image display set UIDs from viewport grid
   */
  private getCurrentlyDisplayedImageUIDs(): string[] {
    const { viewportGridService } = this.servicesManager.services;
    const state = viewportGridService.getState();
    const displaySetUIDs: string[] = [];

    // Iterate through all viewports to collect display set UIDs
    for (const [viewportId, viewport] of state.viewports) {
      const viewportDisplaySetUIDs = viewport.displaySetInstanceUIDs || [];
      displaySetUIDs.push(...viewportDisplaySetUIDs);
    }

    // Remove duplicates and filter out SR display sets
    const uniqueDisplaySetUIDs = [...new Set(displaySetUIDs)];
    return uniqueDisplaySetUIDs.filter(uid => {
      const displaySet = this.servicesManager.services.displaySetService.getDisplaySetByUID(uid);
      return displaySet && displaySet.Modality !== 'SR';
    });
  }

  /**
   * Clear measurements for a specific image (used when switching SR versions)
   */
  clearMeasurementsForImage(imageDisplaySetInstanceUID: string): void {
    const allMeasurements = this.getCurrentMeasurements();

    const measurementsToRemove = allMeasurements.filter(measurement => {
      // Remove measurements that belong to this specific image
      const matchesDisplaySet = measurement.displaySetInstanceUID === imageDisplaySetInstanceUID;
      const matchesImageId = measurement.referencedImageId?.includes(imageDisplaySetInstanceUID);

      // Also check if the measurement's SOPInstanceUID belongs to this display set
      if (measurement.SOPInstanceUID) {
        const displaySet = this.servicesManager.services.displaySetService.getDisplaySetByUID(
          imageDisplaySetInstanceUID
        );
        if (displaySet?.instances) {
          const matchesSOPInstance = displaySet.instances.some(
            (instance: any) => instance.SOPInstanceUID === measurement.SOPInstanceUID
          );
          return matchesDisplaySet || matchesImageId || matchesSOPInstance;
        }
      }

      return matchesDisplaySet || matchesImageId;
    });

    if (measurementsToRemove.length === 0) {
      console.log(
        `[SRManagement] No measurements to remove for image: ${imageDisplaySetInstanceUID}`
      );
      return;
    }

    console.log(
      `[SRManagement] Removing ${measurementsToRemove.length} measurements for image: ${imageDisplaySetInstanceUID}`
    );

    measurementsToRemove.forEach(measurement => {
      this.servicesManager.services.measurementService.remove(measurement.uid);
    });

    console.log(
      `[SRManagement] Successfully removed measurements for image: ${imageDisplaySetInstanceUID}`
    );
  }

  /**
   * Clear measurements that are not related to any currently displayed images
   * This is used to automatically clean up measurements when layout changes
   */
  clearMeasurementsNotInCurrentDisplay(): void {
    const displayedImageUIDs = this.getCurrentlyDisplayedImageUIDs();
    const allMeasurements = this.getCurrentMeasurements();

    if (displayedImageUIDs.length === 0) {
      console.log('[SRManagement] No displayed images found, skipping cleanup');
      return;
    }

    const measurementsToRemove = allMeasurements.filter(measurement => {
      // Keep measurements that belong to any currently displayed image
      const belongsToDisplayedImage = displayedImageUIDs.some(uid => {
        // Check both displaySetInstanceUID and referencedImageId
        const matchesDisplaySet = measurement.displaySetInstanceUID === uid;
        const matchesImageId = measurement.referencedImageId?.includes(uid);

        // Also check if the measurement's SOPInstanceUID belongs to any displayed display set
        if (measurement.SOPInstanceUID) {
          const displaySet =
            this.servicesManager.services.displaySetService.getDisplaySetByUID(uid);
          if (displaySet?.instances) {
            const matchesSOPInstance = displaySet.instances.some(
              (instance: any) => instance.SOPInstanceUID === measurement.SOPInstanceUID
            );
            return matchesDisplaySet || matchesImageId || matchesSOPInstance;
          }
        }

        return matchesDisplaySet || matchesImageId;
      });

      // Remove measurements that don't belong to any displayed image
      return !belongsToDisplayedImage;
    });

    if (measurementsToRemove.length === 0) {
      console.log('[SRManagement] No measurements to cleanup');
      return;
    }

    measurementsToRemove.forEach(measurement => {
      console.log(
        `[SRManagement] Removing measurement ${measurement.uid} (not in current display)`
      );
      this.servicesManager.services.measurementService.remove(measurement.uid);
    });

    console.log(
      `[SRManagement] Cleaned up ${measurementsToRemove.length} measurements not related to currently displayed images`
    );
    console.log(`[SRManagement] Currently displayed image UIDs:`, displayedImageUIDs);
    console.log(`[SRManagement] Remaining measurements:`, this.getCurrentMeasurements().length);
  }

  // Private helper methods

  private getAllSRDisplaySets(): SRDisplaySet[] {
    const activeDisplaySets =
      this.servicesManager.services.displaySetService.getActiveDisplaySets();

    return activeDisplaySets.filter(ds => ds.Modality === 'SR') as SRDisplaySet[];
  }

  private doesSRReferenceImageSOPs(
    srDisplaySet: SRDisplaySet,
    imageSOPInstanceUIDs: string[]
  ): boolean {
    // Extract referenced SOP Instance UIDs from the SR DICOM content
    const referencedSOPs = this.extractReferencedSOPsFromSR(srDisplaySet);

    // Check if any of the image SOP Instance UIDs match the referenced ones
    const hasMatch = imageSOPInstanceUIDs.some(sopUID => referencedSOPs.includes(sopUID));

    if (hasMatch) {
      console.log('[SRManagement] SR references image via SOP Instance UID match:', {
        imageSOPs: imageSOPInstanceUIDs,
        referencedSOPs: referencedSOPs,
      });
    }

    return hasMatch;
  }

  private extractReferencedSOPsFromSR(srDisplaySet: SRDisplaySet): string[] {
    const referencedSOPs: string[] = [];

    if (!srDisplaySet.instances || srDisplaySet.instances.length === 0) {
      return referencedSOPs;
    }

    const srInstance = srDisplaySet.instances[0];

    // Extract from CurrentRequestedProcedureEvidenceSequence - this is the definitive reference
    const evidenceSequence = (srInstance as any).CurrentRequestedProcedureEvidenceSequence;
    if (evidenceSequence) {
      // Handle both single item and array formats
      const evidenceItems = Array.isArray(evidenceSequence) ? evidenceSequence : [evidenceSequence];

      for (const evidence of evidenceItems) {
        const referencedSeries = evidence.ReferencedSeriesSequence;
        if (!referencedSeries) continue;

        // Handle both single series and array of series
        const seriesItems = Array.isArray(referencedSeries) ? referencedSeries : [referencedSeries];

        for (const series of seriesItems) {
          const sopSequence = series.ReferencedSOPSequence;
          if (!sopSequence) continue;

          // Handle both single SOP and array of SOPs
          const sopItems = Array.isArray(sopSequence) ? sopSequence : [sopSequence];

          for (const sop of sopItems) {
            if (sop.ReferencedSOPInstanceUID) {
              referencedSOPs.push(sop.ReferencedSOPInstanceUID);
            }
          }
        }
      }
    }

    console.log(
      '[SRManagement] Extracted referenced SOPs from SR CurrentRequestedProcedureEvidenceSequence:',
      referencedSOPs
    );
    return [...new Set(referencedSOPs)];
  }

  private getDataSource(): Types.DataSourceDefinition {
    const dataSources = this.extensionManager.getDataSources('');
    const dataSource = dataSources[0] as Types.DataSourceDefinition;

    if (!dataSource) {
      throw new Error('No data source available for saving SR');
    }

    return dataSource;
  }

  private createSRDescription(): string {
    const now = new Date();

    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };

    const formattedDateTime = now.toLocaleDateString(undefined, dateOptions);
    return `SignalPET SR ${formattedDateTime}`;
  }

  private async storeMeasurementsAsSR(
    measurements: Measurement[],
    dataSource: any,
    srDescription: string,
    imageDisplaySetInstanceUID: string,
    timestamp: string
  ): Promise<any> {
    // Get SOP Instance UIDs for the source image to include in SR metadata
    const imageDisplaySet = this.servicesManager.services.displaySetService.getDisplaySetByUID(
      imageDisplaySetInstanceUID
    );
    const sourceSOPInstanceUIDs =
      imageDisplaySet?.instances?.map(instance => instance.SOPInstanceUID) || [];

    const studyInstanceUID = imageDisplaySet?.StudyInstanceUID;

    // Get SignalPETStudyID - you can modify this logic to get it from wherever you store it
    const signalPETStudyID = this.getSignalPETStudyID();
    const request = new XMLHttpRequest();

    // Build the STOW URL with SignalPETStudyID query parameter
    const finalUrl = `${dataSource.getConfig().wadoRoot}/studies/${studyInstanceUID}`;
    const finalUrlWithSignalPETStudyID = `${finalUrl}?SignalPETStudyID=${encodeURIComponent(
      signalPETStudyID
    )}`;

    // Override the XMLHttpRequest open method to use our custom URL with query parameters
    const originalOpen = request.open;
    request.open = function (method: string, url: string, async?: boolean) {
      return originalOpen.call(this, method, finalUrlWithSignalPETStudyID, async);
    };

    const naturalizedReport = await this.commandsManager.runCommand('storeMeasurements', {
      measurementData: measurements,
      dataSource: dataSource,
      additionalFindingTypes: ['ArrowAnnotate'], // Follow OHIF pattern for finding types
      options: {
        description: srDescription,
        SeriesDescription: srDescription,
        metadata: {
          sourceSOPInstanceUIDs: sourceSOPInstanceUIDs,
          measurementCount: measurements.length,
          savedAt: timestamp,
        },
      },
      request,
    });

    return naturalizedReport;
  }

  /**
   * Get the SignalPETStudyID - modify this method to retrieve it from your data source
   */
  private getSignalPETStudyID(): string {
    return new URLSearchParams(window.location.search).get('SignalPETStudyID') || '';
  }

  private async hydrateSR(srDisplaySet: SRDisplaySet): Promise<void> {
    if (!srDisplaySet.isLoaded) {
      await srDisplaySet.load();
    }

    if (!srDisplaySet.isHydrated) {
      console.log('[SRManagement] Clearing non-displayed measurements before hydrating SR...');
      this.clearMeasurementsNotInCurrentDisplay();

      console.log('[SRManagement] Hydrating SR with image loading retry...');
      await this.hydrateWithImageLoadRetry(srDisplaySet);
    }
  }

  /**
   * Hydrate SR with retry logic to wait for image loading
   * Uses exponential backoff to retry until the target image is loaded
   */
  private async hydrateWithImageLoadRetry(srDisplaySet: SRDisplaySet): Promise<void> {
    const attemptHydration = async (): Promise<void> => {
      // Check if the target image(s) for this SR are loaded
      const areImagesLoaded = await this.checkIfTargetImagesAreLoaded(srDisplaySet);

      if (!areImagesLoaded) {
        throw new Error('Target images not loaded yet');
      }

      console.log('[SRManagement] Target images are loaded, hydrating SR');
      const result = await this.commandsManager.runCommand('hydrateStructuredReport', {
        displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
      });
      console.log('[SRManagement] SR hydrated successfully:', result);
    };

    try {
      await backOff(attemptHydration, {
        numOfAttempts: 10,
        startingDelay: 100,
        timeMultiple: 2,
        maxDelay: 3000,
        retry: (error, attemptNumber) => {
          console.log(`[SRManagement] Hydration attempt ${attemptNumber} failed: ${error.message}`);
          return true; // Continue retrying
        },
      });
    } catch (error) {
      // If all retries failed, try one final time without checking images
      console.warn('[SRManagement] Failed to hydrate SR after maximum retries - proceeding anyway');
      const result = await this.commandsManager.runCommand('hydrateStructuredReport', {
        displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
      });
      console.log('[SRManagement] SR hydrated successfully after max retries:', result);
    }
  }

  /**
   * Check if the target images referenced by the SR are loaded AND viewport is properly calibrated
   * This prevents annotations from jumping to top-left corner due to coordinate transformation issues
   */
  private async checkIfTargetImagesAreLoaded(srDisplaySet: SRDisplaySet): Promise<boolean> {
    try {
      // Get the SOP Instance UIDs that this SR references
      const referencedSOPs = this.extractReferencedSOPsFromSR(srDisplaySet);

      // Use the utility function to check if images and viewport are ready
      const result = await checkTargetImagesReady(referencedSOPs, this.servicesManager);

      if (!result.imagesReady || !result.viewportReady) {
        console.log('[SRManagement]', result.reason || 'Images/viewport not ready');
        return false;
      }

      console.log('[SRManagement]', result.reason || 'Images and viewport ready');
      return true;
    } catch (error) {
      console.error('[SRManagement] Error checking if target images are loaded:', error);
      // In case of error, assume images are loaded to avoid infinite retry
      return true;
    }
  }

  private ensureMeasurementsVisible(measurements: Measurement[]): void {
    if (measurements.length > 0) {
      console.log('[SRManagement] Setting all measurements as visible...');
      const measurementService = this.servicesManager.services.measurementService;

      measurements.forEach(measurement => {
        if (measurement.isVisible === undefined || measurement.isVisible === null) {
          measurementService.update(measurement.uid, { ...measurement, isVisible: true }, false);
        }
      });
      console.log('[SRManagement] All measurements set to visible');
    }
  }

  private createSRVersionFromDisplaySet(srDisplaySet: SRDisplaySet): SRVersion {
    return {
      displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
      SeriesInstanceUID: srDisplaySet.SeriesInstanceUID || '',
      SOPInstanceUID: srDisplaySet.instances?.[0]?.SOPInstanceUID || '',
      SeriesDate: srDisplaySet.SeriesDate,
      SeriesTime: srDisplaySet.SeriesTime,
      SeriesNumber: srDisplaySet.SeriesNumber,
      SeriesDescription: srDisplaySet.SeriesDescription,
      StudyInstanceUID: srDisplaySet.StudyInstanceUID,
    };
  }

  private sortSRsByLatest(srs: SRVersion[]): SRVersion[] {
    return srs.sort((a, b) => {
      // Compare SeriesDate first
      const dateComparison = (b.SeriesDate || '').localeCompare(a.SeriesDate || '');
      if (dateComparison !== 0) return dateComparison;

      // If dates are same, compare SeriesTime
      const timeComparison = (b.SeriesTime || '').localeCompare(a.SeriesTime || '');
      if (timeComparison !== 0) return timeComparison;

      // If dates and times are same, compare SeriesNumber
      return (b.SeriesNumber || 0) - (a.SeriesNumber || 0);
    });
  }
}
