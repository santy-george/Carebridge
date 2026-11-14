import type { Coordinates } from './visits';

// Best-effort, like the Wellness SOS screen: a denied permission, a timeout
// or a missing GPS fix must never stop a nurse checking in -- the visit just
// records no coordinates.
export function getPosition(timeoutMs = 8000): Promise<Coordinates | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
