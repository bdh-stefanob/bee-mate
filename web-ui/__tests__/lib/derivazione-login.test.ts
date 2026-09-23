import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { derivaLogin, type RegistrazioneGrezza } from '@/lib/derivazione-login';

const REGISTRAZIONE_VERA = path.join(
  REPO_ROOT,
  'reports',
  'recordings',
  'www.saucedemo.com-2026-09-07T08-44-31-218Z.json'
);

describe('derivaLogin: dal blocco grezzo di una registrazione al blocco login', () => {
  it('deriva login su una registrazione vera (sito pubblico di pratica)', () => {
    const registrazione = JSON.parse(fs.readFileSync(REGISTRAZIONE_VERA, 'utf-8')) as RegistrazioneGrezza;
    const risultato = derivaLogin(registrazione, 'demo');

    expect(risultato).not.toBeNull();
    expect(risultato!.login.steps).toEqual([
      { fill: { role: 'textbox', name: 'Username' }, value: '${DEMO_USER}' },
      { fill: { role: 'textbox', name: 'Password' }, value: '${DEMO_PASS}' },
      { click: { role: 'button', name: 'Login' } },
    ]);
    expect(risultato!.variabili).toEqual(['DEMO_USER', 'DEMO_PASS']);
    // readyWhen: la registrazione visita anche /inventory.html dopo la partenza su "/".
    expect(risultato!.readyWhen).toBe('/inventory.html');

    // Nessun valore digitato deve comparire nel risultato: ne' "standard_user"
    // (il nome utente vero, salvato in chiaro nella registrazione), ne' un
    // qualunque frammento della password (che il registratore non salva mai,
    // ma la prova va fatta comunque sul risultato finale).
    const serializzato = JSON.stringify(risultato);
    expect(serializzato).not.toMatch(/standard_user/);
    expect(serializzato).not.toMatch(/secret_sauce/);
    expect(serializzato).not.toMatch(/<password>/);
  });

  it('nessun campo compilato: niente da derivare', () => {
    const registrazione: RegistrazioneGrezza = {
      startUrl: 'https://a.invalid',
      intents: [{ steps: [{ action: 'click', role: 'link', name: 'Home' }] }],
    };
    expect(derivaLogin(registrazione, 'demo')).toBeNull();
  });

  it('registrazione vuota: niente da derivare', () => {
    expect(derivaLogin({ intents: [] }, 'demo')).toBeNull();
  });

  it('scarta i clic di fuoco sul campo che sta per essere compilato', () => {
    const registrazione: RegistrazioneGrezza = {
      startUrl: 'https://a.invalid',
      intents: [
        {
          steps: [
            { action: 'click', role: 'textbox', name: 'Email' },
            { action: 'click', role: 'textbox', name: 'Email' },
            { action: 'fill', role: 'textbox', name: 'Email', value: 'chiunque@example.com' },
            { action: 'fill', role: 'textbox', name: 'Password', value: '<password>', secret: true },
            { action: 'click', role: 'button', name: 'Accedi' },
          ],
        },
      ],
    };
    const risultato = derivaLogin(registrazione, 'app-a')!;
    expect(risultato.login.steps).toEqual([
      { fill: { role: 'textbox', name: 'Email' }, value: '${APP_A_USER}' },
      { fill: { role: 'textbox', name: 'Password' }, value: '${APP_A_PASS}' },
      { click: { role: 'button', name: 'Accedi' } },
    ]);
    expect(JSON.stringify(risultato)).not.toMatch(/chiunque@example\.com/);
  });

  it('i clic prima del primo campo compilato diventano dismiss (banner cookie)', () => {
    const registrazione: RegistrazioneGrezza = {
      startUrl: 'https://a.invalid',
      intents: [
        {
          steps: [
            { action: 'click', role: 'button', name: 'Accept All' },
            { action: 'fill', role: 'textbox', name: 'Email', value: 'x@example.com' },
            { action: 'fill', role: 'textbox', name: 'Password', value: '<password>', secret: true },
            { action: 'click', role: 'button', name: 'Login' },
          ],
        },
      ],
    };
    const risultato = derivaLogin(registrazione, 'app-a')!;
    expect(risultato.login.dismiss).toEqual([{ role: 'button', name: 'Accept All' }]);
  });

  it('un terzo campo compilato prende il nome dalla propria etichetta, non da user/pass', () => {
    const registrazione: RegistrazioneGrezza = {
      startUrl: 'https://a.invalid',
      intents: [
        {
          steps: [
            { action: 'fill', role: 'textbox', name: 'Email', value: 'x@example.com' },
            { action: 'fill', role: 'textbox', name: 'Password', value: '<password>', secret: true },
            { action: 'fill', role: 'textbox', name: 'Codice OTP', value: '123456' },
            { action: 'click', role: 'button', name: 'Login' },
          ],
        },
      ],
    };
    const risultato = derivaLogin(registrazione, 'app-a')!;
    expect(risultato.variabili).toEqual(['APP_A_USER', 'APP_A_PASS', 'APP_A_CODICE_OTP']);
    expect(JSON.stringify(risultato)).not.toMatch(/123456/);
  });

  it('nessun readyWhen quando l\'indirizzo non cambia', () => {
    const registrazione: RegistrazioneGrezza = {
      startUrl: 'https://a.invalid/login',
      pagesVisited: ['https://a.invalid/login'],
      intents: [
        {
          steps: [
            { action: 'fill', role: 'textbox', name: 'Email', value: 'x@example.com' },
            { action: 'fill', role: 'textbox', name: 'Password', value: '<password>', secret: true },
            { action: 'click', role: 'button', name: 'Login' },
          ],
        },
      ],
    };
    const risultato = derivaLogin(registrazione, 'app-a')!;
    expect(risultato.readyWhen).toBeUndefined();
  });
});
