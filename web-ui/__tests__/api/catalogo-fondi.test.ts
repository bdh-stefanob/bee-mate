import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * (F6) La fusione vera nel Catalogo, a livello di rotta, con una coppia di step
 * quasi identici sugli stessi componenti (`test-fixtures/fusione/`; lo scenario e' un `.txt` perche' il controllo di commit valida ogni `.feature` contro il catalogo del repo). Il collaudo
 * V1 non aveva una coppia da fondere (solo una "da distinguere"): non ha potuto
 * provare ne' la fusione ne' la striscia "Annulla". Qui si prova
 * `GET /api/catalogo/fondi` (anteprima), `POST` (fonde) e `POST .../annulla`
 * (file identici a prima, confronto degli hash), in una radice temporanea.
 */

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-fondi-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));
const rigenera = vi.fn(async () => true);
vi.mock('@/lib/rigenerazione-catalogo', () => ({ tentaRigenerazioneCatalogo: () => rigenera() }));

const { GET: anteprima, POST: fondi } = await import('@/app/api/catalogo/fondi/route');
const { POST: annulla } = await import('@/app/api/catalogo/fondi/annulla/route');

const FIXTURE = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'fusione');
const DA = 'the user adds the item';
const A = 'the user puts the item in the cart';
const STEPS_REL = 'src/steps/shop/cart/cart.steps.ts';
const FEATURE_REL = 'src/features/shop/cart/cart.feature';

const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');
const hash = (rel: string) => createHash('sha256').update(fs.readFileSync(path.join(RADICE, rel))).digest('hex');
const hashTutti = () => ({ steps: hash(STEPS_REL), feature: hash(FEATURE_REL), catalogo: hash('step-catalog.json') });

function copia(da: string, rel: string) {
  const p = path.join(RADICE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.copyFileSync(path.join(FIXTURE, da), p);
}

function post(url: string, corpo: unknown, sito = 'same-origin') {
  return new Request(`http://127.0.0.1:3000${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': sito },
    body: JSON.stringify(corpo),
  });
}

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  rigenera.mockClear();
  copia('step-catalog.json', 'step-catalog.json');
  copia('cart.steps.ts', STEPS_REL);
  copia('cart.feature.txt', FEATURE_REL);
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('fusione di una coppia vera (stessi componenti, stesso comportamento)', () => {
  it("l'anteprima dice cosa cambierebbe e non scrive niente", async () => {
    const prima = hashTutti();
    const res = await anteprima(new Request(`http://127.0.0.1:3000/api/catalogo/fondi?da=${encodeURIComponent(DA)}&a=${encodeURIComponent(A)}`));
    const corpo = await res.json();
    expect(res.status).toBe(200);
    expect(corpo).toMatchObject({ equivalenti: true, fileFeatureCoinvolti: 1, righeCoinvolte: 1 });
    expect(hashTutti()).toEqual(prima);
  });

  it('fonde: la frase perdente sparisce dagli scenari e dalle definizioni, quella che resta no', async () => {
    const res = await fondi(post('/api/catalogo/fondi', { da: DA, a: A }));
    expect(await res.json()).toMatchObject({ ok: true, equivalenti: true, fileFeatureAggiornati: 1 });
    expect(leggi(FEATURE_REL)).toContain(`When ${A}`);
    expect(leggi(FEATURE_REL)).not.toContain(DA);
    expect(leggi(STEPS_REL)).not.toContain(`"${DA}"`);
    expect(leggi(STEPS_REL)).toContain(`"${A}"`);
    expect(rigenera).toHaveBeenCalledTimes(1);
  });

  it('annulla riporta tutti i file identici a prima (stessi hash), e una seconda volta non c\'e\' piu\' niente da annullare', async () => {
    const prima = hashTutti();
    await fondi(post('/api/catalogo/fondi', { da: DA, a: A }));
    expect(hashTutti()).not.toEqual(prima);

    const res = await annulla(post('/api/catalogo/fondi/annulla', {}));
    expect(await res.json()).toMatchObject({ ok: true, da: DA, a: A });
    expect(hashTutti()).toEqual(prima);

    const ancora = await annulla(post('/api/catalogo/fondi/annulla', {}));
    expect(ancora.status).toBe(404);
  });

  it('da un\'altra origine: 403, e non scrive niente', async () => {
    const prima = hashTutti();
    expect((await fondi(post('/api/catalogo/fondi', { da: DA, a: A }, 'cross-site'))).status).toBe(403);
    expect((await annulla(post('/api/catalogo/fondi/annulla', {}, 'cross-site'))).status).toBe(403);
    expect(hashTutti()).toEqual(prima);
  });

  it('con due comportamenti diversi rifiuta (409) finche\' il tester non conferma, e non scrive niente', async () => {
    const diverso = leggi(STEPS_REL).replace(
      `"${A}", async function () {\n  await shop.add();`,
      `"${A}", async function () {\n  await shop.addAndOpenCart();`
    );
    fs.writeFileSync(path.join(RADICE, STEPS_REL), diverso);
    const prima = hashTutti();
    const res = await fondi(post('/api/catalogo/fondi', { da: DA, a: A }));
    expect(res.status).toBe(409);
    expect((await res.json()).errore).toBe('corpi_diversi');
    expect(hashTutti()).toEqual(prima);
  });
});
