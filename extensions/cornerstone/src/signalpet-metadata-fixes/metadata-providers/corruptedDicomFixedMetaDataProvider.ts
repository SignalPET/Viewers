import OHIF from '@ohif/core';

// I'm sorry in advance for this method...
// Some of the dicom metadata we're using is corrupted, this aligns it
export function corruptedDicomFixedMetaDataProvider(type, imageId) {
  if (
    ![
      'imagePlaneModule',
      'imagePixelModule',
      'voiLutModule',
      'modalityLutModule',
      'generalImageModule',
    ].includes(type)
  ) {
    return undefined;
  }

  const ohifMetadataProvider = OHIF.classes.MetadataProvider;
  const module = ohifMetadataProvider.get(type, imageId);

  if (module === undefined) {
    return undefined;
  }

  if (type === 'imagePlaneModule') {
    const keysToIgnore = [];
    if (module.pixelSpacing && module.pixelSpacing?.includes?.(NaN)) {
      keysToIgnore.push('pixelSpacing');
    }
    if (module.columnPixelSpacing && module.columnPixelSpacing?.includes?.(',')) {
      keysToIgnore.push('columnPixelSpacing');
    }
    if (module.rowPixelSpacing && module.rowPixelSpacing?.includes?.(',')) {
      keysToIgnore.push('rowPixelSpacing');
    }

    const moduleWithoutKeysToIgnore = Object.fromEntries(
      Object.entries(module).filter(([k]) => !keysToIgnore.includes(k))
    );

    return {
      ...moduleWithoutKeysToIgnore,
      columnCosines: [1, 0, 0],
      rowCosines: [0, 1, 0],
    };
  }

  if (type === 'imagePixelModule') {
    return module;
  }

  if (type === 'voiLutModule') {
    const keysToIgnore = [];
    if (module?.windowCenter && module.windowCenter?.includes?.(NaN)) {
      keysToIgnore.push('windowCenter');
    }

    if (module?.windowWidth && module.windowWidth?.includes?.(NaN)) {
      keysToIgnore.push('windowWidth');
    }

    const moduleWithoutKeysToIgnore = Object.fromEntries(
      Object.entries(module).filter(([k]) => !keysToIgnore.includes(k))
    );

    return {
      ...moduleWithoutKeysToIgnore,
    };
  }

  if (type === 'modalityLutModule') {
    return {
      ...module,
      rescaleIntercept: 0,
      rescaleSlope: 1,
    };
  }
}
