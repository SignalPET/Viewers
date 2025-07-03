import { getJpegRenderedMetadata } from '../JpegRenderedMetadataStore';

export const jpegMetaDataProvider = (type, imageId) => {
  const modules = getJpegRenderedMetadata(imageId);
  if (modules) {
    return modules[type];
  }

  return;
};
