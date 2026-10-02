import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Il vecchio portale (catalogo/editor step) e' spento: i suoi indirizzi
// rimandano al cruscotto. Per riaccenderlo basta mettere questa costante a
// `false` (finche' le sue pagine esistono ancora nel codice).
const SPEGNI_VECCHIO_PORTALE = true;

// `permanent: false` (307): un rimando permanente resterebbe nella memoria del
// browser e renderebbe lento tornare indietro.
const rimandiVecchioPortale = [
  { source: '/portale', destination: '/catalogo' },
  { source: '/components', destination: '/catalogo' },
  { source: '/tags', destination: '/catalogo' },
  { source: '/editor', destination: '/scenari' },
  { source: '/features', destination: '/scenari' },
  { source: '/settings', destination: '/controllo' },
].map((r) => ({ ...r, permanent: false }));

const nextConfig: NextConfig = {
  output: 'standalone',
  // @cucumber/gherkin and @cucumber/messages use node:module internally and are
  // only used in the Node.js runtime (/api/lint). Mark them as server externals so
  // Next.js never tries to bundle them into the client.
  serverExternalPackages: ['@cucumber/gherkin', '@cucumber/messages'],
  async redirects() {
    return SPEGNI_VECCHIO_PORTALE ? rimandiVecchioPortale : [];
  },
};

// Il cruscotto non mette la lingua nell'indirizzo (niente /en/controllo): la
// lingua viaggia in un cookie, letta da src/i18n/request.ts. Cambiare la
// forma degli indirizzi avrebbe rotto il redirect dalla radice e il portale
// del catalogo, che restano com'erano.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
