// cucumber.js — Cucumber.js configuration (CommonJS form for reliable loading).
// Cucumber owns the test lifecycle; Playwright drives the browser inside the
// Page Objects and the World.

module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["src/steps/**/*.ts", "src/support/**/*.ts"],
    paths: ["src/features/**/*.feature"],
    // Gli scenari marcati @non-automatizzato non si eseguono.
    //
    // Sono i casi di test scritti dal team e mai automatizzati: nel repository
    // stanno come documento — sono la prova del fatto F1, "scritti, non
    // automatizzati" — ma Cucumber li trovava, apriva un browser per ognuno e
    // stampava quattrocento righe di "undefined". L'unico scenario che
    // interessava finiva in fondo, illeggibile.
    //
    // Per eseguirli comunque: BDD_TAGS="" npm test
    tags: process.env["BDD_TAGS"] ?? "not @non-automatizzato",
    format: [
      "progress-bar",
      "html:reports/cucumber-report.html",
      "summary",
    ],
    formatOptions: { snippetInterface: "async-await" },
  },
};
