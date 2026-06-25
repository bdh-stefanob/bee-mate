/**
 * step-snippets.ts — Libreria statica di snippet intent dichiarativi.
 *
 * Editabile dal team: aggiungi/rimuovi voci nell'array STEP_SNIPPETS.
 * Ogni snippet incapsula un sotto-flusso ricorrente come singolo blocco
 * dichiarativo, coerente con lo standard BDD del progetto (Cucumber Book,
 * cap. "Declarative vs Imperative").
 *
 * NOTA: non usare nomi aziendali reali — usa solo "Brochure Clinic" o
 * termini generici (regola repo: nessun dato/flusso aziendale reale).
 */

export interface StepSnippet {
  id: string;
  /** Etichetta breve mostrata sul bottone nel pannello Steps. */
  label: string;
  /** Descrizione opzionale mostrata nel tooltip. */
  description?: string;
  /**
   * Righe Gherkin da inserire al cursore (indentazione a 4 spazi).
   * Verranno unite con \n e inserite come blocco.
   */
  lines: string[];
}

export const STEP_SNIPPETS: StepSnippet[] = [
  {
    id: 'mfa-verification',
    label: 'MFA verification',
    description: 'Blocco intent: l\'utente completa la verifica MFA (SMS o EMAIL) — incapsula il sotto-flusso selezione metodo + invio codice + verifica.',
    lines: [
      '    And the user completes MFA verification',
    ],
  },
  {
    id: 'standard-login',
    label: 'Standard login',
    description: 'Scenario di login dichiarativo: un utente registrato accede alla Brochure Clinic con credenziali valide e MFA.',
    lines: [
      '  Scenario: Standard login to Brochure Clinic',
      '    Given a registered user landed on the Brochure home page',
      '    When the user completes the login flow with valid credentials',
      '    And the user completes MFA verification',
      '    Then the user successfully logs in',
    ],
  },
  {
    id: 'scenario-skeleton',
    label: 'Scenario skeleton',
    description: 'Scheletro rapido per un nuovo scenario Gherkin dichiarativo.',
    lines: [
      '  Scenario: ',
      '    Given ',
      '    When ',
      '    Then ',
    ],
  },
  {
    id: 'login-failure',
    label: 'Login failure',
    description: 'Scenario dichiarativo: login fallito per credenziali non valide — il sistema mostra un errore e non consente l\'accesso.',
    lines: [
      '  Scenario: Login failed due to invalid credentials',
      '    Given a registered user landed on the Brochure home page',
      '    When the user attempts login with invalid credentials',
      '    Then the system displays an error message',
      '    And the user is not able to login',
    ],
  },
  {
    id: 'relogin-no-mfa',
    label: 'Re-login (no MFA)',
    description: 'Scenario dichiarativo: re-login senza MFA dopo aver flaggato "Remember this device".',
    lines: [
      '  Scenario: Re-login without MFA after remembering device',
      '    Given a registered user previously logged in with MFA',
      '    And the user previously flagged the \'Remember this device\' option',
      '    When the user completes the login flow with valid credentials',
      '    Then the user successfully logs in',
    ],
  },
];
