/** Push native capabilities are included only in an explicitly enabled build.
 * Current production/preview builds remain inactive. */
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), ...(process.env.EXPO_PUBLIC_PUSH_ENABLED === 'true' ? ['expo-notifications'] : [])],
});
