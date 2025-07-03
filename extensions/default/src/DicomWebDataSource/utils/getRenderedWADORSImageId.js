/**
 * Builds the base instance URL for a WADO-RS rendered endpoint
 * @param {object} instance - The instance metadata object
 * @param {object} config - The configuration object containing wadoRoot
 * @returns {string} The base URL for the instance
 */
function buildInstanceRenderedWadoRsUri(instance, config) {
  const { StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID } = instance;
  return `${config.wadoRoot}/studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/rendered`;
}

/**
 * Builds the rendered WADO-RS URI with frame parameters and format options
 * @param {object} instance - The instance metadata object
 * @param {object} config - The configuration object containing wadoRoot and rendered options
 * @param {number} [frame] - The frame number (1-based for multi-frame images)
 * @returns {string} The complete rendered URL with frame parameters and format options
 */
function buildInstanceRenderedFrameWadoRsUri(instance, config, frame) {
  const baseRenderedUri = buildInstanceRenderedWadoRsUri(instance, config);

  const params = new URLSearchParams();

  // For multi-frame images, we need to specify the frame in the rendered endpoint
  if (frame !== undefined && frame !== null) {
    // WADO-RS rendered endpoint uses 1-based frame numbering
    const frameNumber = frame || 1;
    params.append('frame', frameNumber.toString());
  }

  // Add format specification if configured
  if (config.renderedImageFormat) {
    params.append('accept', config.renderedImageFormat);
  } else {
    // Default to JPEG for rendered images
    params.append('accept', 'image/jpeg');
  }

  // Add quality specification if configured and format supports it
  if (config.renderedImageQuality &&
      (config.renderedImageFormat === 'image/jpeg' || !config.renderedImageFormat)) {
    params.append('quality', config.renderedImageQuality.toString());
  }

  const queryString = params.toString();
  return queryString ? `${baseRenderedUri}?${queryString}` : baseRenderedUri;
}

/**
 * Obtain an imageId for Cornerstone based on the WADO-RS rendered scheme
 * This function generates image IDs that point to pre-rendered images instead of raw DICOM frames
 *
 * @param {object} instance - Instance metadata object (InstanceMetadata)
 * @param {object} config - Configuration object containing wadoRoot and other settings
 * @param {number} [frame] - The frame number for multi-frame images (1-based)
 * @returns {string} The imageId to be used by Cornerstone with renderedwadors: prefix
 */
export default function getRenderedWADORSImageId(instance, config, frame) {
  const uri = buildInstanceRenderedFrameWadoRsUri(instance, config, frame);

  if (!uri) {
    return;
  }

  // Use a different prefix to distinguish rendered images from regular WADORS
  return `renderedwadors:${uri}`;
}

/**
 * Extract components from a rendered WADORS image ID
 * @param {string} imageId - The rendered WADORS image ID
 * @returns {object} Object containing the parsed components
 */
export function parseRenderedWADORSImageId(imageId) {
  if (!imageId || !imageId.startsWith('renderedwadors:')) {
    return null;
  }

  const url = imageId.substring('renderedwadors:'.length);
  const urlObj = new URL(url);

  // Extract path components
  const pathParts = urlObj.pathname.split('/');
  const studiesIndex = pathParts.indexOf('studies');

  if (studiesIndex === -1 || pathParts.length < studiesIndex + 6) {
    return null;
  }

  return {
    StudyInstanceUID: pathParts[studiesIndex + 1],
    SeriesInstanceUID: pathParts[studiesIndex + 3],
    SOPInstanceUID: pathParts[studiesIndex + 5],
    frame: urlObj.searchParams.get('frame'),
    baseUrl: `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.indexOf('/studies'))}`,
    fullUrl: url
  };
}
