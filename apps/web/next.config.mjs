/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = webpackConfig.resolve.alias ?? {};
    webpackConfig.resolve.alias['node:async_hooks'] = false;
    return webpackConfig;
  },
};

export default config;
