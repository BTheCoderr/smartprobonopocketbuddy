/** Infer MIME type from file URI extension. */
export function getMimeForUri(uri: string): 'video/mp4' | 'audio/m4a' {
  return uri.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'audio/m4a';
}

/** Check if a URI points to a video file. */
export function isVideoUri(uri: string): boolean {
  return uri.toLowerCase().endsWith('.mp4');
}
