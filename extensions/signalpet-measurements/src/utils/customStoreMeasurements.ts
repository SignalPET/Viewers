import { metaData, utilities } from '@cornerstonejs/core';
import OHIF, { DicomMetadataStore } from '@ohif/core';
import dcmjs from 'dcmjs';
import { adaptersSR } from '@cornerstonejs/adapters';

import getFilteredCornerstoneToolState from '../../../cornerstone-dicom-sr/src/utils/getFilteredCornerstoneToolState';
const { MeasurementReport } = adaptersSR.Cornerstone3D;
const { log } = OHIF;

interface Options {
  SeriesDescription?: string;
  SeriesInstanceUID?: string;
  SeriesNumber?: number;
  InstanceNumber?: number;
  SeriesDate?: string;
  SeriesTime?: string;
  description?: string;
  metadata?: any;
}

// Copy of the _generateReport function from commandsModule.ts
const _generateReport = (measurementData, additionalFindingTypes, options: Options = {}) => {
  const filteredToolState = getFilteredCornerstoneToolState(
    measurementData,
    additionalFindingTypes
  );

  const report = MeasurementReport.generateReport(
    filteredToolState,
    metaData,
    utilities.worldToImageCoords,
    options
  );

  const { dataset } = report;

  // Set the default character set as UTF-8
  if (typeof dataset.SpecificCharacterSet === 'undefined') {
    dataset.SpecificCharacterSet = 'ISO_IR 192';
  }

  dataset.InstanceNumber = options.InstanceNumber ?? 1;

  return dataset;
};

/**
 * Custom storeMeasurements function that sends SignalPETStudyID as query parameter
 */
export const customStoreMeasurements = async ({
  measurementData,
  dataSource,
  additionalFindingTypes,
  options = {},
  signalPETStudyID,
  customizationService,
}: {
  measurementData: any[];
  dataSource: any;
  additionalFindingTypes?: string[];
  options?: Options;
  signalPETStudyID: string;
  customizationService: any;
}): Promise<any> => {
  // Use the @cornerstonejs adapter for converting to/from DICOM
  // But it is good enough for now whilst we only have cornerstone as a datasource.
  log.info('[DICOMSR] storeMeasurements');

  if (!dataSource || !dataSource.store || !dataSource.store.dicom) {
    log.error('[DICOMSR] datasource has no dataSource.store.dicom endpoint!');
    return Promise.reject({});
  }

  if (!signalPETStudyID) {
    throw new Error('SignalPETStudyID is required');
  }

  try {
    const naturalizedReport = _generateReport(measurementData, additionalFindingTypes, options);

    const { StudyInstanceUID, ContentSequence } = naturalizedReport;
    // The content sequence has 5 or more elements, of which
    // the `[4]` element contains the annotation data, so this is
    // checking that there is some annotation data present.
    if (!ContentSequence?.[4].ContentSequence?.length) {
      console.log('naturalizedReport missing imaging content', naturalizedReport);
      throw new Error('Invalid report, no content');
    }

    const onBeforeDicomStore = customizationService.getCustomization('onBeforeDicomStore');

    let dicomDict;
    if (typeof onBeforeDicomStore === 'function') {
      dicomDict = onBeforeDicomStore({ dicomDict, measurementData, naturalizedReport });
    }

    // Create custom XMLHttpRequest
    const customRequest = new XMLHttpRequest();

    // Build the STOW URL with SignalPETStudyID query parameter
    let finalUrl = `${dataSource.getConfig().wadoRoot}/studies`;
    if (StudyInstanceUID) {
      finalUrl += `/${StudyInstanceUID}`;
    }
    finalUrl += `?SignalPETStudyID=${encodeURIComponent(signalPETStudyID)}`;

    console.log('[SignalPET CustomStoreMeasurements] Storing measurements to URL:', finalUrl);
    console.log('[SignalPET CustomStoreMeasurements] SignalPETStudyID:', signalPETStudyID);

    // Override the XMLHttpRequest open method to use our custom URL with query parameters
    const originalOpen = customRequest.open;
    customRequest.open = function (method: string, url: string, async?: boolean) {
      console.log('[SignalPET CustomStoreMeasurements] Overriding URL from:', url, 'to:', finalUrl);
      return originalOpen.call(this, method, finalUrl, async);
    };

    await dataSource.store.dicom(naturalizedReport, customRequest, dicomDict);

    if (StudyInstanceUID) {
      dataSource.deleteStudyMetadataPromise(StudyInstanceUID);
    }

    // The "Mode" route listens for DicomMetadataStore changes
    // When a new instance is added, it listens and
    // automatically calls makeDisplaySets
    DicomMetadataStore.addInstances([naturalizedReport], true);

    return naturalizedReport;
  } catch (error) {
    console.warn(error);
    log.error(`[DICOMSR] Error while saving the measurements: ${error.message}`);
    throw new Error(error.message || 'Error while saving the measurements.');
  }
};
