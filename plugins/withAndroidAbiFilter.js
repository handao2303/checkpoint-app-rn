const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Restrict the native ABIs compiled into the Android build.
 *
 * By default Expo packs armeabi-v7a + arm64-v8a + x86 + x86_64, so every native
 * library (MapLibre, Hermes, Firebase, reanimated, …) is bundled four times.
 * That is the single biggest contributor to APK size. Limiting to arm64-v8a —
 * which covers essentially every Android phone shipped since ~2016 — cuts the
 * APK roughly in half or more. x86/x86_64 are emulator-only; armeabi-v7a is
 * legacy 32-bit hardware.
 *
 * Usage in app.json:
 *   ["./plugins/withAndroidAbiFilter", { "abis": "arm64-v8a" }]
 */
module.exports = function withAndroidAbiFilter(config, props = {}) {
  const abis = props.abis || 'arm64-v8a';
  return withGradleProperties(config, (cfg) => {
    const key = 'reactNativeArchitectures';
    const existing = cfg.modResults.find(
      (item) => item.type === 'property' && item.key === key,
    );
    if (existing) {
      existing.value = abis;
    } else {
      cfg.modResults.push({ type: 'property', key, value: abis });
    }
    return cfg;
  });
};
