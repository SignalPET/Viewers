import { imageLoader, metaData } from '@cornerstonejs/core';
import { errorHandler } from '@ohif/core';

/**
 * Parse a rendered WADORS image ID to extract components
 * @param {string} imageId - The rendered WADORS image ID
 * @returns {object|null} Object containing the parsed components
 */
function parseRenderedWADORSImageId(imageId) {
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

/**
 * Image loader for rendered WADORS images
 * This loader fetches pre-rendered images from WADORS /rendered endpoints
 * bypassing DICOM decoding for improved performance
 */

/**
 * Load image from rendered WADORS endpoint
 * @param {string} imageId - The rendered WADORS image ID
 * @param {object} options - Loading options
 * @returns {Promise} Promise that resolves to an image object
 */
function loadRenderedWadorsImage(imageId, options = {}) {
  const parsedImageId = parseRenderedWADORSImageId(imageId);

  if (!parsedImageId) {
    return Promise.reject(new Error(`Invalid rendered WADORS imageId: ${imageId}`));
  }

  return new Promise((resolve, reject) => {
    const { fullUrl } = parsedImageId;

    // Create XMLHttpRequest for fetching the rendered image
    const xhr = new XMLHttpRequest();
    xhr.open('GET', fullUrl, true);
    xhr.responseType = 'blob';

    // Set appropriate headers for rendered images
    const acceptHeader = getAcceptHeaderForRenderedImages();
    xhr.setRequestHeader('Accept', acceptHeader);

    // Add authentication headers if available
    const authHeaders = getAuthenticationHeaders();
    if (authHeaders) {
      Object.keys(authHeaders).forEach(key => {
        xhr.setRequestHeader(key, authHeaders[key]);
      });
    }

    xhr.onload = function() {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const url = URL.createObjectURL(blob);

        // Create an Image element to load the rendered image
        const img = new Image();

        img.onload = function() {
          // Create canvas to get pixel data
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          ctx.drawImage(img, 0, 0);

          // Get pixel data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Determine if the image is color or grayscale
          const isColor = detectColorImage(imageData);

          // Create cornerstone image object
          const cornerstoneImage = {
            imageId,
            width: canvas.width,
            height: canvas.height,
            color: isColor,
            columnPixelSpacing: getPixelSpacing(imageId, 'column') || 1.0,
            rowPixelSpacing: getPixelSpacing(imageId, 'row') || 1.0,
            sizeInBytes: imageData.data.length,
            getPixelData: () => imageData.data,
            minPixelValue: 0,
            maxPixelValue: 255,
            slope: 1,
            intercept: 0,
            windowCenter: isColor ? 128 : getWindowCenter(imageId) || 128,
            windowWidth: isColor ? 256 : getWindowWidth(imageId) || 256,
            render: imageRenderer,
            data: {
              byteArray: imageData.data,
              blob: blob,
              url: url
            }
          };

          // Clean up object URL
          URL.revokeObjectURL(url);

          resolve(cornerstoneImage);
        };

        img.onerror = function() {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to load rendered image: ${imageId}`));
        };

        img.src = url;
      } else {
        reject(new Error(`HTTP ${xhr.status}: Failed to fetch rendered image: ${imageId}`));
      }
    };

    xhr.onerror = function() {
      reject(new Error(`Network error loading rendered image: ${imageId}`));
    };

    xhr.ontimeout = function() {
      reject(new Error(`Timeout loading rendered image: ${imageId}`));
    };

    // Set a reasonable timeout
    xhr.timeout = options.timeout || 30000;

    xhr.send();
  });
}

/**
 * Custom image renderer for rendered images
 * @param {object} enabledElement - The enabled element
 * @param {object} invalidated - Invalidated flag
 */
function imageRenderer(enabledElement, invalidated) {
  // For rendered images, we can use the default renderer
  // since they're already processed and don't need DICOM-specific rendering
}

/**
 * Get authentication headers from the extension manager
 * @returns {object|null} Authentication headers or null
 */
function getAuthenticationHeaders() {
  try {
    // Access the authentication service if available
    const windowAny = window;
    // @ts-ignore - Custom property added by OHIF
    if (windowAny.services && windowAny.services.userAuthenticationService) {
      // @ts-ignore - Custom property added by OHIF
      return windowAny.services.userAuthenticationService.getAuthorizationHeader();
    }

    // @ts-ignore - Custom property added by OHIF
    if (windowAny.extensionManager) {
      // @ts-ignore - Custom property added by OHIF
      const dataSource = windowAny.extensionManager.getActiveDataSource()?.[0];
      if (dataSource && dataSource.getConfig) {
        const config = dataSource.getConfig();
        // Return any authentication headers from the data source config
        return config.headers || null;
      }
    }
  } catch (error) {
    console.warn('Failed to get authentication headers:', error);
  }

  return null;
}

/**
 * Get pixel spacing from metadata
 * @param {string} imageId - The image ID
 * @param {string} type - 'row' or 'column'
 * @returns {number|null} Pixel spacing value
 */
function getPixelSpacing(imageId, type) {
  try {
    const metadata = metaData.get('imagePlaneModule', imageId);
    if (metadata && metadata.pixelSpacing) {
      return type === 'row' ? metadata.pixelSpacing[0] : metadata.pixelSpacing[1];
    }

    // Fallback to general metadata
    const generalMetadata = metaData.get('instance', imageId);
    if (generalMetadata && generalMetadata.PixelSpacing) {
      return type === 'row' ? generalMetadata.PixelSpacing[0] : generalMetadata.PixelSpacing[1];
    }
  } catch (error) {
    console.warn(`Failed to get pixel spacing for ${imageId}:`, error);
  }

  return null;
}

/**
 * Get the appropriate Accept header for rendered images based on configuration
 * @returns {string} Accept header value
 */
function getAcceptHeaderForRenderedImages() {
  try {
    // @ts-ignore - Custom property added by OHIF
    const windowAny = window;
    // @ts-ignore - Custom property added by OHIF
    if (windowAny.extensionManager) {
      // @ts-ignore - Custom property added by OHIF
      const dataSource = windowAny.extensionManager.getActiveDataSource()?.[0];
      if (dataSource && dataSource.getConfig) {
        const config = dataSource.getConfig();

        // Use custom accept header if specified
        if (config.renderedImageAcceptHeader) {
          return config.renderedImageAcceptHeader.join(', ');
        }

        // Use configured format or default
        if (config.renderedImageFormat) {
          return config.renderedImageFormat;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get rendered image accept header from config:', error);
  }

  // Default accept header for rendered images
  return 'image/jpeg, image/png, image/gif, image/*';
}

/**
 * Detect if an image is color or grayscale
 * @param {ImageData} imageData - The image data
 * @returns {boolean} True if the image is color
 */
function detectColorImage(imageData) {
  const { data } = imageData;
  const length = data.length;

  // Sample every 100th pixel to check for color
  for (let i = 0; i < length; i += 400) { // 400 = 100 pixels * 4 components
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If R, G, B values are significantly different, it's a color image
    if (Math.abs(r - g) > 10 || Math.abs(g - b) > 10 || Math.abs(r - b) > 10) {
      return true;
    }
  }

  return false;
}

/**
 * Get window center from metadata
 * @param {string} imageId - The image ID
 * @returns {number|null} Window center value
 */
function getWindowCenter(imageId) {
  try {
    const metadata = metaData.get('voiLutModule', imageId);
    if (metadata && metadata.windowCenter) {
      return Array.isArray(metadata.windowCenter) ? metadata.windowCenter[0] : metadata.windowCenter;
    }
  } catch (error) {
    console.warn(`Failed to get window center for ${imageId}:`, error);
  }

  return null;
}

/**
 * Get window width from metadata
 * @param {string} imageId - The image ID
 * @returns {number|null} Window width value
 */
function getWindowWidth(imageId) {
  try {
    const metadata = metaData.get('voiLutModule', imageId);
    if (metadata && metadata.windowWidth) {
      return Array.isArray(metadata.windowWidth) ? metadata.windowWidth[0] : metadata.windowWidth;
    }
  } catch (error) {
    console.warn(`Failed to get window width for ${imageId}:`, error);
  }

  return null;
}

/**
 * Register the rendered WADORS image loader
 */
export function registerRenderedWadorsImageLoader() {
  // Register the image loader with cornerstone
  imageLoader.registerImageLoader('renderedwadors', loadRenderedWadorsImage);

  console.log('Rendered WADORS image loader registered');
}

/**
 * Unregister the rendered WADORS image loader
 */
export function unregisterRenderedWadorsImageLoader() {
  imageLoader.unregisterImageLoader('renderedwadors');
  console.log('Rendered WADORS image loader unregistered');
}

export default {
  loadRenderedWadorsImage,
  registerRenderedWadorsImageLoader,
  unregisterRenderedWadorsImageLoader
};
