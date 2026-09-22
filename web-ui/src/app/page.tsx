import { redirect } from 'next/navigation';

// La radice non ha piu' un contenuto proprio: il tester deve arrivare sul
// cruscotto sia in Electron sia quando l'app gira con "npm run dev" in un
// browser qualsiasi, senza dipendere da come e' stata aperta la finestra.
export default function Home() {
  redirect('/controllo');
}
