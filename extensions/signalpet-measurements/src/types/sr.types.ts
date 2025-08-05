export interface SRVersion {
  displaySetInstanceUID: string;
  SeriesInstanceUID: string;
  SOPInstanceUID: string;
  SeriesDate?: string;
  SeriesTime?: string;
  SeriesNumber?: number;
  SeriesDescription?: string;
  isLoaded: boolean;
  isHydrated: boolean;
  isRehydratable: boolean;
  measurements?: any[];
  StudyInstanceUID: string;
}

export interface SRManagementAPI {
  // Requirement 1: Read and load latest SR
  loadLatestSR(): Promise<SRVersion | null>;

  // Requirement 2: Get all SR versions
  getAllSRVersions(): Promise<SRVersion[]>;

  // Get SR versions for a specific image/series
  getSRVersionsForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion[]>;

  // Requirement 3: Save SR
  saveSR(description?: string): Promise<SRVersion>;

  // Requirement 4: Apply specific SR
  applySR(displaySetInstanceUID: string): Promise<SRVersion>;

  // Utility methods
  getCurrentMeasurements(): any[];
  clearCurrentMeasurements(): void;
}
