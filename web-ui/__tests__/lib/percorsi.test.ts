import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { dentroLaCartella } from '@/lib/percorsi';

const RADICE = path.resolve('/repo/reports/recordings');

describe('un percorso che arriva dalla finestra', () => {
  it('passa se sta dentro e ha la sua estensione', () => {
    expect(dentroLaCartella(RADICE, 'sessione.json', '.json')).toBe(
      path.join(RADICE, 'sessione.json')
    );
  });

  it('non risale con ..', () => {
    expect(dentroLaCartella(RADICE, '../../.env', '.json')).toBeNull();
    expect(dentroLaCartella(RADICE, '../scout/pagina.json', '.json')).toBeNull();
  });

  it('non accetta un percorso assoluto', () => {
    expect(dentroLaCartella(RADICE, 'C:\\Windows\\win.json', '.json')).toBeNull();
    expect(dentroLaCartella(RADICE, '/etc/passwd.json', '.json')).toBeNull();
  });

  it("non si fa ingannare da una cartella che inizia come quella giusta", () => {
    // Senza il separatore nel prefisso, "recordings-altro" passerebbe: il
    // confronto sarebbe fra testi, e quel testo comincia davvero per
    // "...recordings".
    expect(dentroLaCartella(RADICE, '../recordings-altro/x.json', '.json')).toBeNull();
  });

  it("vuole l'estensione giusta", () => {
    expect(dentroLaCartella(RADICE, 'sessione.txt', '.json')).toBeNull();
  });

  it('non distingue le maiuscole, come il disco su cui gira', () => {
    expect(dentroLaCartella(RADICE, 'Sessione.json', '.json')).not.toBeNull();
  });
});
