import { Types } from '@ohif/core';
import { SRManagementAPI, SRVersion, SRDisplaySet, Measurement } from '../types';

export class SRManagementService implements SRManagementAPI {
  constructor(
    private readonly servicesManager: any, // TODO: Type as AppTypes.ServicesManager when available
    private readonly commandsManager: any, // TODO: Type as CommandsManager when available
    private readonly extensionManager: any // TODO: Type as ExtensionManager when available
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
   * Apply the latest SR for a specific image
   */
  async applyLatestSRForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion | null> {
    console.log('[SRManagement] Loading latest SR for image:', imageDisplaySetInstanceUID);

    const imageSRs = await this.getSRVersionsForImage(imageDisplaySetInstanceUID);
    if (imageSRs.length === 0) {
      console.log('[SRManagement] No SRs found for image:', imageDisplaySetInstanceUID);
      return null;
    }

    const latestSR = this.sortSRsByLatest(imageSRs)[0];
    console.log('[SRManagement] Found latest SR for image:', latestSR.displaySetInstanceUID);

    await this.applySR(latestSR.displaySetInstanceUID);
    return latestSR;
  }

  /**
   * Save SR for specific image display set
   */
  async saveSR(imageDisplaySetInstanceUID: string): Promise<SRVersion> {
    console.log(
      '[SRManagement] Saving current measurements as SR for image:',
      imageDisplaySetInstanceUID
    );

    if (!imageDisplaySetInstanceUID) {
      throw new Error('Image display set instance UID is required for saving SR');
    }

    const measurements = this.getCurrentMeasurements();
    if (measurements.length === 0) {
      throw new Error('No measurements to save');
    }

    const dataSource = this.getDataSource();
    const srDescription = this.createSRDescription(imageDisplaySetInstanceUID);
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

      // Wait for SR to be added to displaySets
      await this.delay(1000);

      // Convert the naturalized report to SRVersion format
      return this.createSRVersionFromNaturalizedReport(
        naturalizedReport,
        srDescription,
        measurements
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
      this.clearCurrentMeasurements();
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
   * Clear current measurements from the measurement service
   */
  clearCurrentMeasurements(): void {
    const measurements = this.getCurrentMeasurements();
    measurements.forEach(measurement => {
      this.servicesManager.services.measurementService.remove(measurement.uid);
    });
    console.log('[SRManagement] Cleared all current measurements');
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
    if (evidenceSequence && Array.isArray(evidenceSequence)) {
      evidenceSequence.forEach(evidence => {
        const referencedSeries = evidence.ReferencedSeriesSequence;
        if (referencedSeries && Array.isArray(referencedSeries)) {
          referencedSeries.forEach(series => {
            const sopSequence = series.ReferencedSOPSequence;
            if (sopSequence && Array.isArray(sopSequence)) {
              sopSequence.forEach(sop => {
                if (sop.ReferencedSOPInstanceUID) {
                  referencedSOPs.push(sop.ReferencedSOPInstanceUID);
                }
              });
            }
          });
        }
      });
    }

    console.log(
      '[SRManagement] Extracted referenced SOPs from SR CurrentRequestedProcedureEvidenceSequence:',
      referencedSOPs
    );
    return [...new Set(referencedSOPs)]; // Remove duplicates
  }

  private getDataSource(): Types.DataSourceDefinition {
    const dataSources = this.extensionManager.getDataSources();
    const dataSource = dataSources[0] as Types.DataSourceDefinition;

    if (!dataSource) {
      throw new Error('No data source available for saving SR');
    }

    return dataSource;
  }

  private createSRDescription(imageDisplaySetInstanceUID: string): string {
    const timestamp = new Date().toISOString();
    const imageContext = ` [Image: ${imageDisplaySetInstanceUID.substring(0, 8)}...]`;
    return `SignalPET SR ${timestamp}${imageContext}`;
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

    const naturalizedReport = await this.commandsManager.runCommand('storeMeasurements', {
      measurementData: measurements,
      dataSource,
      additionalFindingTypes: [],
      options: {
        description: srDescription,
        SeriesDescription: srDescription,
        metadata: {
          sourceSOPInstanceUIDs: sourceSOPInstanceUIDs,
          measurementCount: measurements.length,
          savedAt: timestamp,
        },
      },
    });

    return naturalizedReport;
  }

  /**
   * Convert naturalized report from storeMeasurements to SRVersion format
   */
  private createSRVersionFromNaturalizedReport(
    naturalizedReport: any,
    srDescription: string,
    measurements: Measurement[]
  ): SRVersion {
    if (
      !naturalizedReport?.displaySetInstanceUID ||
      !naturalizedReport?.SeriesInstanceUID ||
      !naturalizedReport?.SOPInstanceUID
    ) {
      throw new Error('Naturalized report missing required UIDs');
    }

    const now = new Date();
    return {
      displaySetInstanceUID: naturalizedReport.displaySetInstanceUID,
      SeriesInstanceUID: naturalizedReport.SeriesInstanceUID,
      SOPInstanceUID: naturalizedReport.SOPInstanceUID,
      SeriesDate: naturalizedReport.SeriesDate || now.toISOString().slice(0, 8),
      SeriesTime: naturalizedReport.SeriesTime || now.toISOString().slice(11, 17).replace(/:/g, ''),
      SeriesNumber: naturalizedReport.SeriesNumber || 999,
      SeriesDescription: srDescription,
      StudyInstanceUID: naturalizedReport.StudyInstanceUID,
    };
  }

  private async hydrateSR(srDisplaySet: SRDisplaySet): Promise<void> {
    await srDisplaySet.load();

    await this.delay(300);

    console.log('[SRManagement] Hydrating SR...');
    const result = await this.commandsManager.runCommand('hydrateStructuredReport', {
      displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
    });
    console.log('[SRManagement] SR hydrated successfully:', result);
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
