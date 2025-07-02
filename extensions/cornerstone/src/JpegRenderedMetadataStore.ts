// JpegRenderedMetadataStore.ts
// A simple in-memory store that maps imageIds of `/rendered/` JPEGs to
// pre-computed Cornerstone metadata modules.  The store lives entirely on
// the OHIF side so we avoid touching Cornerstone3D internals.

const jpegRenderedMetadataStore: Map<string, Record<string, unknown>> = new Map();

export function setJpegRenderedMetadata(imageId: string, modules: Record<string, unknown>): void {
  console.log('[CS3D JPEG Metadata] Setting metadata for', imageId);
  jpegRenderedMetadataStore.set(imageId, modules);
}

export function getJpegRenderedMetadata(imageId: string): Record<string, unknown> | undefined {
  return jpegRenderedMetadataStore.get(imageId);
}

export function purgeJpegRenderedMetadata(): void {
  jpegRenderedMetadataStore.clear();
}

export default jpegRenderedMetadataStore;
