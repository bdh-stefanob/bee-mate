import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Il vecchio portale (catalogo/editor step) e' stato tolto: chi ha ancora un
// segnalibro con i suoi indirizzi non trova un 404, ma il cruscotto. I rimandi si
// possono togliere quando nessuno li usa piu'.
// `permanent: false` (307): un rimando permanente resterebbe nella memoria del
// browser anche se un giorno un indirizzo tornasse ad avere una pagina.
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
    return rimandiVecchioPortale;
  },
};

// Il cruscotto non mette la lingua nell'indirizzo (niente /en/controllo): la
// lingua viaggia in un cookie, letta da src/i18n/request.ts. Cambiare la
// forma degli indirizzi avrebbe rotto il redirect dalla radice.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
