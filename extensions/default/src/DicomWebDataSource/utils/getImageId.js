import getWADORSImageId from './getWADORSImageId';

function buildInstanceWadoUrl(config, instance, options = {}) {
  const { StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID } = instance;
  const params = [];

  params.push('requestType=WADO');
  params.push(`studyUID=${StudyInstanceUID}`);
  params.push(`seriesUID=${SeriesInstanceUID}`);
  params.push(`objectUID=${SOPInstanceUID}`);

  // Add imageQuality parameter if specified
  if (options.imageQuality !== undefined) {
    params.push(`imageQuality=${options.imageQuality}`);
  }

  const paramString = params.join('&');

  return `${config.wadoUriRoot}?${paramString}`;
}

/**
 * Generate multiple image IDs for progressive loading
 * @param {object} params - Parameters object
 * @param {object} params.instance - Instance object
 * @param {object} params.config - Configuration object
 * @param {number} params.frame - Frame number
 * @returns {array} Array of imageIds for different quality levels
 */
export function buildProgressiveImageIds({ instance, config, frame }) {
  const qualityLevels = [
    { imageQuality: 25, name: 'low' },
    { imageQuality: 50, name: 'medium' },
    { imageQuality: 75, name: 'high' },
    { imageQuality: 100, name: 'full' },
  ];

  return qualityLevels.map(level => {
    const wadouri = buildInstanceWadoUrl(config, instance, level);
    let imageId = 'dicomweb:' + wadouri;

    if (frame !== undefined) {
      imageId += '&frame=' + frame;
    }

    return {
      imageId,
      imageQuality: level.imageQuality,
      name: level.name,
    };
  });
}

/**
 * Obtain an imageId for Cornerstone from an image instance
 *
 * @param instance
 * @param frame
 * @param thumbnail
 * @param progressiveLoading - Whether to enable progressive loading
 * @returns {string} The imageId to be used by Cornerstone
 */
export default function getImageId({
  instance,
  frame,
  config,
  thumbnail = false,
  progressiveLoading = false,
}) {
  if (!instance) {
    return;
  }

  if (instance.imageId && frame === undefined) {
    return instance.imageId;
  }

  if (instance.url) {
    return instance.url;
  }

  const renderingAttr = thumbnail ? 'thumbnailRendering' : 'imageRendering';

  if (!config[renderingAttr] || config[renderingAttr] === 'wadouri') {
    // If progressive loading is enabled, return the lowest quality first
    if (progressiveLoading) {
      const qualityLevels = buildProgressiveImageIds({ instance, config, frame });
      return qualityLevels[0].imageId; // Return lowest quality (imageQuality=25) for initial load
    }

    const wadouri = buildInstanceWadoUrl(config, instance);

    let imageId = 'dicomweb:' + wadouri;
    if (frame !== undefined) {
      imageId += '&frame=' + frame;
    }

    return imageId;
  } else {
    return getWADORSImageId(instance, config, frame); // WADO-RS Retrieve Frame
  }
}
