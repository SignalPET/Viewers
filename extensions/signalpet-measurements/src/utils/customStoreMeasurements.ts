import { metaData, utilities } from '@cornerstonejs/core';
import OHIF, { DicomMetadataStore } from '@ohif/core';
import dcmjs from 'dcmjs';
import { adaptersSR } from '@cornerstonejs/adapters';
import { multipartEncode } from 'dicomweb-client/src/message.js';

import getFilteredCornerstoneToolState from '../../../cornerstone-dicom-sr/src/utils/getFilteredCornerstoneToolState';

const { DicomMetaDictionary, DicomDict } = dcmjs.data;
const { denaturalizeDataset } = DicomMetaDictionary;
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
 * Convert naturalized report to DICOM buffer
 */
const convertReportToDicomBuffer = (naturalizedReport: any): ArrayBuffer => {
  const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';
  const ImplementationClassUID = '1.2.840.10008.1.2.1.99';
  const ImplementationVersionName = 'dcmjs';

  const meta = {
    FileMetaInformationVersion: naturalizedReport._meta?.FileMetaInformationVersion?.Value,
    MediaStorageSOPClassUID: naturalizedReport.SOPClassUID,
    MediaStorageSOPInstanceUID: naturalizedReport.SOPInstanceUID,
    TransferSyntaxUID: EXPLICIT_VR_LITTLE_ENDIAN,
    ImplementationClassUID,
    ImplementationVersionName,
  };

  const denaturalizedMeta = denaturalizeDataset(meta);
  const dicomDict = new DicomDict(denaturalizedMeta);
  dicomDict.dict = denaturalizeDataset(naturalizedReport);

  return dicomDict.write();
};

/**
 * Add headers from the dataSource to the request
 */
const addDataSourceHeaders = (request: XMLHttpRequest, dataSource: any): void => {
  const headers =
    dataSource.implementation?._wadoDicomWebClient?.headers ||
    dataSource._wadoDicomWebClient?.headers;

  if (headers) {
    Object.keys(headers).forEach(key => {
      request.setRequestHeader(key, headers[key]);
    });
  }
};

/**
 * Custom storeMeasurements function that sends SignalPETStudyID as query parameter
 */
export const customStoreMeasurements = async ({
  measurementData,
  dataSource,
  additionalFindingTypes = [],
  options = {},
  signalPETStudyID,
}: {
  measurementData: any[];
  dataSource: any;
  additionalFindingTypes?: string[];
  options?: Options;
  signalPETStudyID: string;
}): Promise<any> => {
  log.info('[SignalPET CustomStoreMeasurements] storeMeasurements');

  if (!dataSource || !dataSource.store || !dataSource.store.dicom) {
    log.error(
      '[SignalPET CustomStoreMeasurements] datasource has no dataSource.store.dicom endpoint!'
    );
    return Promise.reject({});
  }

  if (!signalPETStudyID) {
    throw new Error('SignalPETStudyID is required');
  }

  try {
    const naturalizedReport = _generateReport(measurementData, additionalFindingTypes, options);

    const { StudyInstanceUID, ContentSequence } = naturalizedReport;

    // Validate that we have content
    if (!ContentSequence?.[4].ContentSequence?.length) {
      console.log('naturalizedReport missing imaging content', naturalizedReport);
      throw new Error('Invalid report, no content');
    }

    // Create custom XMLHttpRequest
    const customRequest = new XMLHttpRequest();

    // Build the STOW URL
    let finalUrl = `${dataSource.getConfig().wadoRoot}/studies`;
    if (StudyInstanceUID) {
      finalUrl += `/${StudyInstanceUID}`;
    }

    // Add only the SignalPETStudyID query parameter
    finalUrl += `?SignalPETStudyID=${encodeURIComponent(signalPETStudyID)}`;

    console.log('[SignalPET CustomStoreMeasurements] Storing measurements to URL:', finalUrl);
    console.log('[SignalPET CustomStoreMeasurements] SignalPETStudyID:', signalPETStudyID);

    // Convert naturalized report to DICOM buffer
    const part10Buffer = convertReportToDicomBuffer(naturalizedReport);

    // Encode as multipart for STOW-RS
    const { data, boundary } = multipartEncode([part10Buffer]);

    return new Promise((resolve, reject) => {
      customRequest.open('POST', finalUrl, true);

      // Set headers
      customRequest.setRequestHeader(
        'Content-Type',
        `multipart/related; type="application/dicom"; boundary="${boundary}"`
      );
      customRequest.setRequestHeader('Accept', 'application/dicom+json');

      // Add any custom headers from the dataSource
      addDataSourceHeaders(customRequest, dataSource);

      customRequest.onreadystatechange = () => {
        if (customRequest.readyState === 4) {
          if (customRequest.status === 200 || customRequest.status === 202) {
            console.log(
              '[SignalPET CustomStoreMeasurements] Store request successful:',
              customRequest.status
            );

            // Clean up study metadata cache
            if (StudyInstanceUID) {
              dataSource.deleteStudyMetadataPromise(StudyInstanceUID);
            }

            // Add to metadata store
            DicomMetadataStore.addInstances([naturalizedReport], true);

            resolve(naturalizedReport);
          } else {
            const error = new Error(`Store request failed with status: ${customRequest.status}`);
            console.error('[SignalPET CustomStoreMeasurements] Store request failed:', error);
            console.error(
              '[SignalPET CustomStoreMeasurements] Response:',
              customRequest.responseText
            );
            reject(error);
          }
        }
      };

      customRequest.onerror = () => {
        const error = new Error('Store request network error');
        console.error('[SignalPET CustomStoreMeasurements] Network error:', error);
        reject(error);
      };

      // Send the request with the multipart data
      customRequest.send(data);
    });
  } catch (error) {
    console.warn(error);
    log.error(
      `[SignalPET CustomStoreMeasurements] Error while saving the measurements: ${error.message}`
    );
    throw new Error(error.message || 'Error while saving the measurements.');
  }
};
