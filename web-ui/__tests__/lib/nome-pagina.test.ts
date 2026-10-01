import { describe, it, expect } from 'vitest';
import { nomeLeggibilePagina } from '@/lib/nome-pagina';

describe('nome leggibile della pagina', () => {
  it('toglie il suffisso Page e separa le parole', () => {
    expect(nomeLeggibilePagina('InventoryPage')).toBe('Inventory');
    expect(nomeLeggibilePagina('CartPage')).toBe('Cart');
    expect(nomeLeggibilePagina('RicarichePage')).toBe('Ricariche');
    expect(nomeLeggibilePagina('CheckoutStepOnePage')).toBe('Checkout step one');
  });

  it('un nome senza il suffisso resta com\'e\', con le parole separate', () => {
    expect(nomeLeggibilePagina('Header')).toBe('Header');
    expect(nomeLeggibilePagina('ProductDetail')).toBe('Product detail');
  });

  it('le sigle restano in maiuscolo', () => {
    expect(nomeLeggibilePagina('SMSCodePage')).toBe('SMS code');
    expect(nomeLeggibilePagina('FAQPage')).toBe('FAQ');
  });

  it('un nome che e\' solo "Page", vuoto o con separatori non si rompe', () => {
    expect(nomeLeggibilePagina('Page')).toBe('Page');
    expect(nomeLeggibilePagina('')).toBe('');
    expect(nomeLeggibilePagina('login_page')).toBe('Login');
    expect(nomeLeggibilePagina('  CartPage ')).toBe('Cart');
  });

  it('una lista di nomi si legge con le virgole', async () => {
    const { nomiLeggibiliPagine } = await import('@/lib/nome-pagina');
    expect(nomiLeggibiliPagine(['CartPage', 'InventoryPage'])).toBe('Cart, Inventory');
  });
});