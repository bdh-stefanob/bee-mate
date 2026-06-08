// cucumber.js — Cucumber.js configuration (CommonJS form for reliable loading).
// Cucumber owns the test lifecycle; Playwright drives the browser inside the
// Page Objects and the World.

module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["src/steps/**/*.ts", "src/support/**/*.ts"],
    paths: ["src/features/**/*.feature"],
    format: [
      "progress-bar",
      "html:reports/cucumber-report.html",
      "summary",
    ],
    formatOptions: { snippetInterface: "async-await" },
  },
};
