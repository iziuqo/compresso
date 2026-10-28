// Android size settings. Shared config lives in app.json.
//
// Every release build drops unused resources. The Play Store build (AAB)
// keeps all four CPU types, because Play sends each phone only its own.
// The preview APK is installed by hand, so it carries only arm64-v8a (every
// 64-bit Android phone) and stores native code compressed.
const isPreview = process.env.EAS_BUILD_PROFILE === 'preview';

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...config.plugins,
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          ...(isPreview && {
            buildArchs: ['arm64-v8a'],
            useLegacyPackaging: true,
          }),
        },
      },
    ],
  ],
});
