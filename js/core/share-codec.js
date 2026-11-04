/* Encode un deck dans un lien (…#d=code) et le décode.
   Le deck est compressé quand le navigateur sait le faire (préfixe "z"),
   sinon il est juste encodé (préfixe "j"). Rien ne passe par un serveur. */

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeShare(deck) {
  const payload = {
    n: deck.name,
    c: deck.cards.map((c) => [c.q, c.a]),
    lq: deck.langQ,
    la: deck.langA,
    k: deck.color
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream === 'function') {
    try {
      return 'z' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
    } catch {
      /* navigateur sans deflate-raw : version non compressée */
    }
  }
  return 'j' + toBase64Url(bytes);
}

export async function decodeShare(code) {
  const kind = code.charAt(0);
  let bytes = fromBase64Url(code.slice(1));
  if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  else if (kind !== 'j') throw new Error('format de lien inconnu');

  const p = JSON.parse(new TextDecoder().decode(bytes));
  if (!p || !Array.isArray(p.c)) throw new Error('lien invalide');
  return {
    name: String(p.n || 'Deck partagé').slice(0, 120),
    cards: p.c.filter((x) => Array.isArray(x) && x[0] && x[1]).map(([q, a]) => ({ q: String(q), a: String(a) })),
    langQ: p.lq,
    langA: p.la,
    color: p.k
  };
}
