/* filters displayed DICOM instances by their SignalPET study ID */
/** This isn't necessary in this repo, it's kept here so devs don't have to copy it from the default.js file in the SignalPET repo */
const instanceFilter = (query, instance) => {
  // 31C51020 is a private SiganlPET tag that stores the StudyID
  const instanceStudyId = instance['31C51020']?.Value?.[0];
  const queryStudyId = parseInt(query.get('SignalPETStudyID'));
  const historicalStudyIds =
    query
      .get('RelatedSignalPETStudyIDs')
      ?.split(',')
      ?.map(id => parseInt(id)) ?? [];

  if (isNaN(queryStudyId)) {
    return true;
  }

  return instanceStudyId == queryStudyId || historicalStudyIds.includes(instanceStudyId);
};

/** @type {AppTypes.Config} */
window.config = {
  name: 'config/default.js',
  // whiteLabeling: {},
  extensions: ['@signalpet/extension-signalpet-measurements'],
  modes: [],
  customizationService: [
    {
      'viewportOverlay.topLeft': {
        $set: [
          {
            id: 'patientIdOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Patient ID: ',
            color: 'rgba(255, 255, 255, 0.5)',
            title: 'Patient ID: ',
            condition: ({ instance }) => instance && instance.PatientID,
            attribute: 'PatientID',
          },
          {
            id: 'patientNameOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Patient Name: ',
            attribute: 'PatientName',
            title: 'Patient Name',
            color: 'rgba(255, 255, 255, 0.5)',
            condition: ({ instance }) =>
              instance && instance.PatientName && instance.PatientName.Alphabetic,
            contentF: ({ instance, formatters: { formatPN } }) =>
              formatPN(instance.PatientName.Alphabetic),
          },
          {
            id: 'studyDateOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Study Date: ',
            attribute: 'StudyDate',
            title: 'Study Date',
            color: 'rgba(255, 255, 255, 0.5)',
            condition: ({ instance }) => instance && instance.StudyDate,
            contentF: ({ instance, formatters: { formatDate } }) => formatDate(instance.StudyDate),
          },
          {
            id: 'studyTimeOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Study Time: ',
            attribute: 'StudyTime',
            title: 'Study Time',
            color: 'rgba(255, 255, 255, 0.5)',
            condition: ({ instance }) => instance && instance.StudyTime,
            contentF: ({ instance, formatters: { formatTime } }) => formatTime(instance.StudyTime),
          },
          {
            id: 'speciesOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Species: ',
            attribute: 'PatientSpeciesDescription',
            title: 'Species',
            color: 'rgba(255, 255, 255, 0.5)',
            condition: ({ instance }) => instance && instance.PatientSpeciesDescription,
            contentF: ({ instance }) => instance.PatientSpeciesDescription,
          },
          {
            id: 'patientSexOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Patient Sex: ',
            attribute: 'PatientSex',
            title: 'Patient Sex',
            color: 'rgba(255, 255, 255, 0.5)',
            condition: ({ instance }) => instance && instance.PatientSex,
            contentF: ({ instance }) => instance.PatientSex,
          },
          {
            id: 'patientBreedOverlay',
            inheritsFrom: 'ohif.overlayItem',
            label: 'Patient Breed: ',
            attribute: 'PatientBreed',
            title: 'Patient Breed',
            color: 'rgba(255, 255, 255, 0.5)',
            condition: ({ instance }) => instance && instance.PatientBreed,
            contentF: ({ instance }) => instance.PatientBreed,
          },
        ],
      },
      //  The "Demo Study" label is rendered whenever the demoStudy is set in the URL
      'viewportOverlay.topRight': {
        $set: [
          {
            id: 'demoStudyLabel',
            inheritsFrom: 'ohif.overlayItem',
            title: 'DEMO STUDY',
            condition: ({ isDemoStudy }) =>
              new URLSearchParams(window.location.search).get('demoStudy') === 'true',
            contentF: () => 'DEMO STUDY',
            color: 'yellow',
          },
        ],
      },
      'studyBrowser.thumbnailClickCallback': {
        callbacks: [
          ({ activeViewportId, servicesManager, commandsManager, isHangingProtocolLayout }) =>
            async displaySetInstanceUID => {
              const { hangingProtocolService, uiNotificationService } = servicesManager.services;
              let updatedViewports = [];
              const viewportId = activeViewportId;
              try {
                updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
                  viewportId,
                  displaySetInstanceUID,
                  isHangingProtocolLayout
                );
              } catch (error) {
                console.warn(error);
                uiNotificationService.show({
                  title: 'Thumbnail Click',
                  message: 'The selected display sets could not be added to the viewport.',
                  type: 'error',
                  duration: 3000,
                });
              }
              commandsManager.run('setDisplaySetsForViewports', {
                viewportsToUpdate: updatedViewports,
              });
            },
        ],
      },
      'studyBrowser.thumbnailDoubleClickCallback': {},
      'ohif.aboutModal': {
        hidden: true,
      },
      'ui.studyBrowserHeader': null,
      'panel.left.initialWidth': 89,
      'studyBrowser.thumbnailMenuItems': [
        {
          id: 'tagBrowser',
          label: 'Tag Browser',
          iconName: 'DicomTagBrowser',
          onClick: ({ commandsManager, displaySetInstanceUID }) => {
            commandsManager.runCommand('openDICOMTagViewer', {
              displaySetInstanceUID,
            });
          },
        },
      ],
    },
  ],
  showStudyList: true,
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  investigationalUseDialog: { option: 'never' },
  showPatientInfo: 'disabled',
  strictZSpacingForVolumeViewport: true,
  measurementTrackingMode: 'none',
  groupEnabledModesFirst: true,
  enableStudyLazyLoad: true,
  allowMultiSelectExport: false,
  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    // Prefetch number is dependent on the http protocol. For http 2 or
    // above, the number of requests can be go a lot higher.
    prefetch: 25,
  },
  studyPrefetcher: {
    enabled: true,
    order: 'downward',
    displaySetCount: 2,
    maxNumPrefetchRequests: 5,
  },
  // Defines multi-monitor layouts
  multimonitor: [
    {
      id: 'split',
      test: ({ multimonitor }) => multimonitor === 'split',
      screens: [
        {
          id: 'ohif0',
          screen: null,
          location: {
            screen: 0,
            width: 0.5,
            height: 1,
            left: 0,
            top: 0,
          },
          options: 'location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
        {
          id: 'ohif1',
          screen: null,
          location: {
            width: 0.5,
            height: 1,
            left: 0.5,
            top: 0,
          },
          options: 'location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
      ],
    },

    {
      id: '2',
      test: ({ multimonitor }) => multimonitor === '2',
      screens: [
        {
          id: 'ohif0',
          screen: 0,
          location: {
            width: 1,
            height: 1,
            left: 0,
            top: 0,
          },
          options: 'fullscreen=yes,location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
        {
          id: 'ohif1',
          screen: 1,
          location: {
            width: 1,
            height: 1,
            left: 0,
            top: 0,
          },
          options: 'fullscreen=yes,location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
      ],
    },
  ],
  defaultDataSourceName: 'signalpet',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'signalpet',
      configuration: {
        friendlyName: 'SignalPET PACS',
        name: 'signalpet',
        wadoUriRoot: 'http://localhost:6969/internal/pacs/wado',
        qidoRoot: 'http://localhost:6969/internal/pacs/rs',
        wadoRoot: 'http://localhost:6969/internal/pacs/rs',
        imageRendering: 'wadors',
        thumbnailRendering: 'thumbnail',
        acceptHeader: ['multipart/related; type=*/*; transfer-syntax=*'],
        dicomUploadEnabled: false,
        omitQuotationForMultipartRequest: true,
        enableStudyLazyLoad: true,
        instanceFilter,
      },
    },
  ],
  modesConfiguration: {
    '@ohif/mode-longitudinal': {
      // TODO DAN REVIEW: This is a lot, let's consider doing it programmatically on extension load, so we touch less stuff
      routes: [
        {
          path: 'longitudinal',
          layoutTemplate: params => {
            // Static recreation of default longitudinal layout for future compatibility
            // Based on ohif-source/modes/longitudinal/src/index.ts
            const defaultLayout = {
              id: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
              props: {
                leftPanels: ['@ohif/extension-measurement-tracking.panelModule.seriesList'],
                leftPanelResizable: true,
                rightPanels: [
                  '@ohif/extension-cornerstone.panelModule.panelSegmentation',
                  '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
                ],
                rightPanelClosed: true,
                rightPanelResizable: true,
                viewports: [
                  {
                    namespace:
                      '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
                    displaySetsToDisplay: [
                      '@ohif/extension-default.sopClassHandlerModule.stack',
                      '@ohif/extension-dicom-video.sopClassHandlerModule.dicom-video',
                      '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr-3d',
                      '@ohif/extension-default.sopClassHandlerModule.DicomMicroscopySopClassHandler',
                    ],
                  },
                  {
                    namespace: '@ohif/extension-cornerstone-dicom-sr.viewportModule.dicom-sr',
                    displaySetsToDisplay: [
                      '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr',
                    ],
                  },
                  {
                    namespace: '@ohif/extension-dicom-pdf.viewportModule.dicom-pdf',
                    displaySetsToDisplay: [
                      '@ohif/extension-dicom-pdf.sopClassHandlerModule.dicom-pdf',
                    ],
                  },
                  {
                    namespace: '@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg',
                    displaySetsToDisplay: [
                      '@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg',
                    ],
                  },
                  {
                    namespace: '@ohif/extension-cornerstone-dicom-pmap.viewportModule.dicom-pmap',
                    displaySetsToDisplay: [
                      '@ohif/extension-cornerstone-dicom-pmap.sopClassHandlerModule.dicom-pmap',
                    ],
                  },
                  {
                    namespace: '@ohif/extension-cornerstone-dicom-rt.viewportModule.dicom-rt',
                    displaySetsToDisplay: [
                      '@ohif/extension-cornerstone-dicom-rt.sopClassHandlerModule.dicom-rt',
                    ],
                  },
                ],
              },
            };

            // Add our custom panel to the existing right panels and open the panel
            return {
              ...defaultLayout,
              props: {
                ...defaultLayout.props,
                rightPanels: [
                  '@signalpet/extension-signalpet-measurements.panelModule.trackedMeasurements',
                ],
                rightPanelClosed: false,
              },
            };
          },
        },
      ],
    },
  },
  httpErrorHandler: error => {
    // This is 429 when rejected from the public idc sandbox too often.
    console.warn(error.status);

    // Could use services manager here to bring up a dialog/modal if needed.
    console.warn('test, navigate to https://ohif.org/');
  },
  // whiteLabeling: {
  //   createLogoComponentFn: function (React) {
  //     return React.createElement(
  //       'a',
  //       {
  //         target: '_self',
  //         rel: 'noopener noreferrer',
  //         className: 'text-purple-600 line-through',
  //         href: '_X___IDC__LOGO__LINK___Y_',
  //       },
  //       React.createElement('img', {
  //         src: './Logo.svg',
  //         className: 'w-14 h-14',
  //       })
  //     );
  //   },
  // },
};
