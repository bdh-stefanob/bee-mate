import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: 'standalone',
  // @cucumber/gherkin and @cucumber/messages use node:module internally and are
  // only used in the Node.js runtime (/api/lint). Mark them as server externals so
  // Next.js never tries to bundle them into the client.
  serverExternalPackages: ['@cucumber/gherkin', '@cucumber/messages'],
};

// Il cruscotto non mette la lingua nell'indirizzo (niente /en/controllo): la
// lingua viaggia in un cookie, letta da src/i18n/request.ts. Cambiare la
// forma degli indirizzi avrebbe rotto il redirect dalla radice e il portale
// del catalogo, che restano com'erano.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
