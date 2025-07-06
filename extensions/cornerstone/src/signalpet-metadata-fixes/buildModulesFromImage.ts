/**
 * Builds DICOM metadata modules from a rendered JPEG image for progressive loading support.
 *
 * This function extracts metadata from rendered JPEG images to support progressive loading
 * functionality. When using progressive loading with JPEGs, the metadata returned from
 * DICOM /metadata endpoints may not match the actual JPEG image data, causing decoding errors.
 *
 * By extracting metadata directly from the rendered JPEG image, we ensure the metadata
 * matches the image data exactly, enabling proper decoding and display of progressive
 * quality levels.
 *
 * The extracted metadata is stored in the jpegRenderedMetadataStore to be used later
 * when the image needs to be decoded or rendered.
 *
 * @param imageId - The unique identifier for the image
 * @param image - The cornerstone image object containing the imageFrame with metadata
 * @returns Record<string, unknown> - DICOM metadata modules extracted from the image
 */

import { Enums, type Types } from '@cornerstonejs/core';

export default function buildModulesFromImage(
  imageId: string,
  image: Types.IImage
): Record<string, unknown> {
  const { MetadataModules } = Enums;

  // Cornerstone guarantees imageFrame is present on the image object it emits.
  const frame = (image as Types.IImage & { imageFrame?: Types.IImageFrame }).imageFrame;

  if (!frame) {
    return {};
  }

  // IMAGE_PIXEL module is critical for decoding and rendering.
  const normalizedPhotometric =
    frame.photometricInterpretation === 'MONOCHROME1'
      ? 'MONOCHROME2'
      : frame.photometricInterpretation;

  const imagePixelModule = {
    samplesPerPixel: frame.samplesPerPixel,
    photometricInterpretation: normalizedPhotometric,
    planarConfiguration: frame.planarConfiguration,
    rows: frame.rows,
    columns: frame.columns,
    bitsAllocated: frame.bitsAllocated,
    bitsStored: frame.bitsStored,
    highBit: (frame as unknown as { highBit?: number }).highBit ?? frame.bitsStored - 1,
    pixelRepresentation: frame.pixelRepresentation,
    smallestPixelValue: frame.smallestPixelValue,
    largestPixelValue: frame.largestPixelValue,
    redPaletteColorLookupTableDescriptor: frame.redPaletteColorLookupTableDescriptor,
    greenPaletteColorLookupTableDescriptor: frame.greenPaletteColorLookupTableDescriptor,
    bluePaletteColorLookupTableDescriptor: frame.bluePaletteColorLookupTableDescriptor,
    redPaletteColorLookupTableData: frame.redPaletteColorLookupTableData,
    greenPaletteColorLookupTableData: frame.greenPaletteColorLookupTableData,
    bluePaletteColorLookupTableData: frame.bluePaletteColorLookupTableData,
  };

  // GENERAL_IMAGE module – basic instance level tags that overlays may use.
  const generalImageModule = {
    sopInstanceUID: imageId, // placeholder – not available for rendered JPEGs
    instanceNumber: undefined,
    lossyImageCompression: '01', // yes, we know it is lossy
  };

  // IMAGE_PLANE – orientation/spacing.  We do not know true positioning, so supply defaults.
  const imagePlaneModule = {
    frameOfReferenceUID: undefined,
    rows: frame.rows,
    columns: frame.columns,
    imageOrientationPatient: [1, 0, 0, 0, 1, 0],
    rowCosines: [1, 0, 0],
    columnCosines: [0, 1, 0],
    imagePositionPatient: [0, 0, 0],
    sliceThickness: 1,
    sliceLocation: 0,
    pixelSpacing: [1, 1],
    rowPixelSpacing: 1,
    columnPixelSpacing: 1,
    usingDefaultValues: true,
  };

  // VOI_LUT – use default full range of the decoded image
  const voiLutModule = {
    windowCenter: [(frame.largestPixelValue + frame.smallestPixelValue) / 2],
    windowWidth: [frame.largestPixelValue - frame.smallestPixelValue],
  };

  // MODALITY_LUT – identity transform
  const modalityLutModule = {
    rescaleIntercept: 0,
    rescaleSlope: 1,
    rescaleType: 'US',
  };

  return {
    [MetadataModules.IMAGE_PIXEL]: imagePixelModule,
    [MetadataModules.GENERAL_IMAGE]: generalImageModule,
    [MetadataModules.IMAGE_PLANE]: imagePlaneModule,
    [MetadataModules.VOI_LUT]: voiLutModule,
    [MetadataModules.MODALITY_LUT]: modalityLutModule,
  };
}
