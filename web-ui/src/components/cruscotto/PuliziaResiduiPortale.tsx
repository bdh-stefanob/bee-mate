'use client';

import { useEffect } from 'react';
import { ripulisciResiduiPortale } from '@/lib/residui-portale';

/** Non disegna niente: al montaggio toglie dal profilo i residui del vecchio portale (token, bozze). */
export function PuliziaResiduiPortale() {
  useEffect(() => {
    let archivio: Storage | null = null;
    try {
      archivio = window.localStorage;
    } catch {
      archivio = null;
    }
    ripulisciResiduiPortale(archivio);
  }, []);
  return null;
}
