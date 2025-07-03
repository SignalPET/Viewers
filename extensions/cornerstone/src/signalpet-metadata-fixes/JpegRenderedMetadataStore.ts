// This store is used to implement progressive loading in OHIF. The issue is that
// the metadata returned from /metadata endpoints is not the same as the metadata
// needed for rendered JPEGs, which causes decoding errors. By managing the state
// of JPEGs separately, we can use the correct metadata for each quality level,
// enabling the display of rendered JPEGs at different quality levels and thus
// supporting progressive loading of JPEGs.

// The JPEG metadata is extracted from the image frame in buildModulesFromImage.ts

const jpegRenderedMetadataStore: Map<string, Record<string, unknown>> = new Map();

export function setJpegRenderedMetadata(imageId: string, modules: Record<string, unknown>): void {
  jpegRenderedMetadataStore.set(imageId, modules);
}

export function getJpegRenderedMetadata(imageId: string): Record<string, unknown> | undefined {
  return jpegRenderedMetadataStore.get(imageId);
}

export function purgeJpegRenderedMetadata(): void {
  jpegRenderedMetadataStore.clear();
}

export default jpegRenderedMetadataStore;
