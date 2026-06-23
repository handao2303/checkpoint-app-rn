// Static art host — all checkpoint images, level icons, badges, and avatar
// frames are served from this CDN. Do not change unless the CDN domain changes.
export const CDN_ROOT = "https://media.checkpoint-app.space";

export function cdnUrl(path: string): string {
  return `${CDN_ROOT}/${path.replace(/^\//, "")}`;
}

export function levelIcon(level: number): string {
  return cdnUrl(`levels/${level}.svg`);
}

export function avatarFrameUrl(frameId: string): string {
  return cdnUrl(`frames/${frameId}.svg`);
}

export function badgeIcon(badgeKey: string): string {
  return cdnUrl(`badges/${badgeKey}.svg`);
}
