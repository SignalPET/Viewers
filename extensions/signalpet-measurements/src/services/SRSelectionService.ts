/**
 * OHIF-compliant service for handling SR selection events
 * Follows OHIF PubSubService pattern for consistency
 */
import { PubSubService } from '@ohif/core';

export interface SRSelectionEventData {
  displaySetInstanceUID: string;
  targetImageDisplaySetUID: string;
  source: 'single-image' | 'multi-image';
  previousSRDisplaySetInstanceUID: string;
}

export class SRSelectionService extends PubSubService {
  public static readonly EVENTS = {
    SR_SELECTION_REQUESTED: 'event::srSelectionService:srSelectionRequested',
  };

  public static REGISTRATION = {
    name: 'srSelectionService',
    altName: 'SRSelectionService',
    create: ({ configuration = {} }) => {
      return new SRSelectionService();
    },
  };

  constructor() {
    super(SRSelectionService.EVENTS);
  }

  /**
   * Request SR selection - broadcasts event for init.ts to handle
   */
  public requestSRSelection(data: SRSelectionEventData): void {
    console.log('[SR Selection Service] Broadcasting SR selection request:', data);

    this._broadcastEvent(SRSelectionService.EVENTS.SR_SELECTION_REQUESTED, data);
  }
}

export default SRSelectionService;
