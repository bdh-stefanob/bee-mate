import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // @cucumber/gherkin and @cucumber/messages use node:module internally and are
  // only used in the Node.js runtime (/api/lint). Mark them as server externals so
  // Next.js never tries to bundle them into the client.
  serverExternalPackages: ['@cucumber/gherkin', '@cucumber/messages'],
};

export default nextConfig;
