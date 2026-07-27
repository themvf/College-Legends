/**
 * Addressable randomness: a draw depends only on its immutable path, never call order.
 *
 * The engine addresses draws with keys that differ by a single trailing
 * character — loop indices (`result:0`, `result:1`), Box-Muller pairs
 * (`normal-a`, `normal-b`), and sequential player identifiers. FNV-1a alone
 * ends on a multiply, so those neighbours map to outputs separated by a fixed
 * constant, which makes nearby draws an arithmetic sequence rather than
 * independent samples. The murmur3 finalizer below diffuses every input bit
 * across the whole word, so adjacent keys decorrelate.
 *
 * Any replacement hash must keep an avalanche step for the same reason.
 */
export class AddressableRng {
  constructor(private readonly rootSeed: string, private readonly path = "") {}
  fork(...parts: readonly string[]): AddressableRng { return new AddressableRng(this.rootSeed, [this.path, ...parts].filter(Boolean).join("/")); }
  at(key: string): number {
    const input = `${this.rootSeed}|${this.path}|${key}`;
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) { hash ^= input.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 2246822507);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 3266489909);
    hash ^= hash >>> 16;
    return ((hash >>> 0) + 0.5) / 4294967296;
  }
  between(key: string, minimum: number, maximum: number): number { return minimum + this.at(key) * (maximum - minimum); }
  /**
   * A bounded standard-normal draw. Both Box-Muller inputs are taken from the
   * same path so the pair stays addressable, and the finalizer keeps them
   * independent.
   */
  normal(key: string, standardDeviations = 4): number {
    const first = Math.max(Number.EPSILON, this.at(`${key}:normal-a`));
    const second = this.at(`${key}:normal-b`);
    const draw = Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
    return Math.max(-standardDeviations, Math.min(standardDeviations, draw));
  }
}
