// Build-time config on top of app.json.
//
// APP_VARIANT=poc builds "Compresso POC": its own app id, so a proof of
// concept installs beside the store app on a tester's phone and never
// touches its photos, settings or updates. EAS sets it in the "poc" profile.
//
// Android size: every release build drops unused resources. The Play Store
// build (AAB) keeps all four CPU types, because Play sends each phone only
// its own. Hand-installed APKs (preview, poc) carry only arm64-v8a (every
// 64-bit Android phone) and store native code compressed.
const poc = process.env.APP_VARIANT === 'poc';
const handInstalled = ['preview', 'poc'].includes(process.env.EAS_BUILD_PROFILE);

module.exports = ({ config }) => ({
  ...config,
  ...(poc && {
    name: 'Compresso POC',
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.poc` },
    android: { ...config.android, package: `${config.android.package}.poc` },
  }),
  plugins: [
    ...config.plugins,
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          ...(handInstalled && {
            buildArchs: ['arm64-v8a'],
            useLegacyPackaging: true,
          }),
        },
      },
    ],
  ],
});
