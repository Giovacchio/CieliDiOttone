// Dado "a seme": dato lo stesso seme produce sempre gli stessi numeri.
// Serve ai test e al simulatore per rigiocare una battaglia identica.
export function creaDado(seme) {
  let s = (seme === undefined ? (Date.now() ^ Math.floor(Math.random() * 2 ** 32)) : seme) >>> 0;
  return {
    casuale() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

// Dado costruito su una funzione qualsiasi (per esempio una lista di numeri decisi dal test).
export const dadoDa = (fn) => ({ casuale: fn });
