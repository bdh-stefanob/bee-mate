import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack(config) {
    // @cucumber/messages/dist/version.js uses `node:module` which webpack cannot
    // resolve in either client or server bundles. Alias it to false so webpack
    // emits an empty module instead of failing. The gherkinLinter wraps all use of
    // @cucumber/gherkin in try/catch, so the linter gracefully falls back to manual
    // rules when the require fails at runtime.
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:module': false,
    };
    return config;
  },
};

export default nextConfig;
