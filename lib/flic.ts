/**
 * Flic buttons use Bluetooth Low Energy. Web Bluetooth is only available over HTTPS
 * and in Chromium-based browsers (Chrome desktop, Android Chrome). It does not work
 * in Safari on iOS/iPadOS.
 *
 * On iPad, the large on-screen mic control is the supported path. A native Flic bridge
 * (Flic's iOS app / SDK) would be required for hardware button support outside Chrome —
 * not included in phase one.
 *
 * This stub preserves the intended API; wire real UUIDs and characteristics when
 * validating on a supported browser with Flic documentation.
 */
export async function connectFlic(
  _onSingleClick: () => void,
  _onDoubleClick: () => void,
  _onLongPress: () => void,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.bluetooth) {
    throw new Error(
      "Web Bluetooth is unavailable (use Chrome on desktop/Android over HTTPS, or the on-screen mic on iPad Safari).",
    );
  }

  await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: "Flic" }],
    optionalServices: [],
  });

  throw new Error(
    "Flic BLE subscription is not implemented in phase one — use the on-screen mic. See lib/flic.ts.",
  );
}
