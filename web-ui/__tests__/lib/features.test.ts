import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { walkFeatures, parseFeatureSummary } from '@/lib/features';

// Helper: crea un albero temporaneo di file .feature per i test
function makeTmpFeatureDir(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'features-test-'));
  fs.mkdirSync(path.join(tmp, 'auth'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'orders'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'auth', 'login.feature'), '@auth\nFeature: Login\n  Scenario: success\n  Scenario Outline: failure\n');
  fs.writeFileSync(path.join(tmp, 'orders', 'list.feature'), 'Feature: Order List\n  Scenario: view orders\n');
  fs.writeFileSync(path.join(tmp, 'README.md'), '# ignored');
  return tmp;
}

describe('walkFeatures', () => {
  it('Test 1: ritorna SOLO file che terminano in .feature', () => {
    const tmp = makeTmpFeatureDir();
    const files = walkFeatures(tmp);
    expect(files.every(f => f.endsWith('.feature'))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('Test 2: include file nelle sottocartelle (auth/login.feature, orders/list.feature)', () => {
    const tmp = makeTmpFeatureDir();
    const files = walkFeatures(tmp);
    expect(files.length).toBe(2);
    expect(files.some(f => f.includes('auth'))).toBe(true);
    expect(files.some(f => f.includes('orders'))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('Test 3: i path sono relativi a FEATURES_DIR e usano / anche su Windows', () => {
    const tmp = makeTmpFeatureDir();
    const files = walkFeatures(tmp);
    expect(files.every(f => !f.includes('\\'))).toBe(true);
    // Nessun path deve iniziare con il tmp dir
    expect(files.every(f => !path.isAbsolute(f))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('parseFeatureSummary', () => {
  it('Test 4: estrae name, area dal tag @, scenarioCount', () => {
    const content = '@auth\nFeature: Authentication\n  Scenario: valid login\n  Scenario Outline: invalid login\n';
    const result = parseFeatureSummary(content, 'auth/login.feature');
    expect(result.name).toBe('Authentication');
    expect(result.area).toBe('auth');
    expect(result.scenarioCount).toBe(2);
    expect(result.file).toBe('auth/login.feature');
  });

  it('Test 4b: area fallback alla prima cartella se nessun tag @', () => {
    const content = 'Feature: Checkout\n  Scenario: pay\n';
    const result = parseFeatureSummary(content, 'checkout/checkout.feature');
    expect(result.area).toBe('checkout');
  });

  it('Test 4c: name fallback se nessuna Feature:', () => {
    const content = 'Scenario: orphan\n';
    const result = parseFeatureSummary(content, 'misc/orphan.feature');
    expect(result.name).toBe('(unnamed)');
  });
});
