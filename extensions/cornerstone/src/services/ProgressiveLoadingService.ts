import { PubSubService } from '@ohif/core';
import { imageLoader, eventTarget, EVENTS as csEvents, StackViewport } from '@cornerstonejs/core';

export interface QualityLevel {
  imageId: string;
  imageQuality: number;
  name: string;
}

export interface ProgressiveLoadingConfig {
  enabled: boolean;
  qualityLevels: QualityLevel[];
  loadingDelay: number; // Delay between quality levels in ms
  autoProgressToNext: boolean;
}

/**
 * Build instance WADO URL with quality options
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInstanceWadoUrl(config: any, instance: any, options: any = {}): string {
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
 */
function buildProgressiveImageIds({
  instance,
  config,
  frame,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  frame?: number;
}): QualityLevel[] {
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

class ProgressiveLoadingService extends PubSubService {
  static REGISTRATION = {
    name: 'progressiveLoadingService',
    altName: 'ProgressiveLoadingService',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: ({ servicesManager }: any): ProgressiveLoadingService => {
      return new ProgressiveLoadingService(servicesManager);
    },
  };

  static EVENTS = {
    QUALITY_LEVEL_LOADED: 'QUALITY_LEVEL_LOADED',
    PROGRESSIVE_LOADING_COMPLETE: 'PROGRESSIVE_LOADING_COMPLETE',
    PROGRESSIVE_LOADING_ERROR: 'PROGRESSIVE_LOADING_ERROR',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private servicesManager: any;
  private loadingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeLoadingSessions: Set<string> = new Set();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(servicesManager: any) {
    super(ProgressiveLoadingService.EVENTS);
    this.servicesManager = servicesManager;
  }

  /**
   * Load an image progressively with multiple quality levels
   */
  public async loadImageProgressively(
    instance: any,
    config: any,
    frame?: number,
    viewportId?: string
  ): Promise<any> {
    const qualityLevels = buildProgressiveImageIds({ instance, config, frame });
    const baseImageId = this.getBaseImageId(qualityLevels[0].imageId);

    if (this.activeLoadingSessions.has(baseImageId)) {
      console.log('🎯 Progressive loading already active for:', baseImageId);
      return;
    }

    console.log('🎯 Starting progressive loading for:', baseImageId);
    console.log(
      '🎯 Quality levels:',
      qualityLevels.map(q => `${q.imageQuality}%`)
    );
    console.log('🎯 ViewportId:', viewportId || 'not provided');

    this.activeLoadingSessions.add(baseImageId);

    // Start loading additional quality levels (skip the first one as it's already loaded)
    this.scheduleNextQualityLevel(qualityLevels, baseImageId, 1);

    return qualityLevels[0];
  }

  /**
   * Load a single quality level
   */
  private async loadSingleQuality(qualityLevel: QualityLevel, baseImageId: string): Promise<any> {
    try {
      console.log(
        `🎯 Loading quality level: ${qualityLevel.imageQuality}% (${qualityLevel.imageId})`
      );

      // Use cornerstone's image loader to load and cache the image
      const image = await imageLoader.loadAndCacheImage(qualityLevel.imageId);

      console.log(`✅ Loaded quality level: ${qualityLevel.imageQuality}%`);

      this._broadcastEvent(ProgressiveLoadingService.EVENTS.QUALITY_LEVEL_LOADED, {
        baseImageId,
        qualityLevel,
        image,
      });

      return image;
    } catch (error) {
      console.error(`❌ Failed to load quality level ${qualityLevel.imageQuality}%:`, error);
      this._broadcastEvent(ProgressiveLoadingService.EVENTS.PROGRESSIVE_LOADING_ERROR, {
        baseImageId,
        qualityLevel,
        error,
      });
      throw error;
    }
  }

  /**
   * Schedule loading of the next quality level
   */
  private scheduleNextQualityLevel(
    qualityLevels: QualityLevel[],
    baseImageId: string,
    nextIndex: number
  ): void {
    if (nextIndex >= qualityLevels.length) {
      console.log('🎉 Progressive loading complete for:', baseImageId);
      this.activeLoadingSessions.delete(baseImageId);
      this._broadcastEvent(ProgressiveLoadingService.EVENTS.PROGRESSIVE_LOADING_COMPLETE, {
        baseImageId,
        finalQualityLevel: qualityLevels[qualityLevels.length - 1],
      });
      return;
    }

    const qualityLevel = qualityLevels[nextIndex];
    console.log(
      `⏰ Scheduling quality level ${nextIndex + 1}/${qualityLevels.length} (${qualityLevel.imageQuality}%)`
    );

    // Load this quality level after a delay
    const timeout = setTimeout(async () => {
      try {
        await this.loadSingleQuality(qualityLevel, baseImageId);
        // Schedule the next level
        this.scheduleNextQualityLevel(qualityLevels, baseImageId, nextIndex + 1);
      } catch (error) {
        console.warn(`Failed to load quality level ${nextIndex}:`, error);
        // Continue with next quality level even if one fails
        this.scheduleNextQualityLevel(qualityLevels, baseImageId, nextIndex + 1);
      }
    }, 2000); // 2 second delay between quality levels

    this.loadingTimeouts.set(`${baseImageId}:${nextIndex}`, timeout);
  }

  /**
   * Cancel progressive loading for a specific image
   */
  public cancelProgressiveLoading(baseImageId: string): void {
    // Clear any scheduled timeouts
    this.loadingTimeouts.forEach((timeout, key) => {
      if (key.startsWith(baseImageId)) {
        clearTimeout(timeout);
        this.loadingTimeouts.delete(key);
      }
    });

    this.activeLoadingSessions.delete(baseImageId);
  }

  /**
   * Get the base image ID without quality parameters
   */
  private getBaseImageId(imageId: string): string {
    return imageId.replace(/[&?]imageQuality=\d+/g, '');
  }

  /**
   * Check if progressive loading is in progress for an image
   */
  public isProgressiveLoadingInProgress(baseImageId: string): boolean {
    return this.activeLoadingSessions.has(baseImageId);
  }
}

export default ProgressiveLoadingService;
