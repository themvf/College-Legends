/** Addressable randomness: a draw depends only on its immutable path, never call order. */
export class AddressableRng {
  constructor(private readonly rootSeed: string, private readonly path = "") {}
  fork(...parts: readonly string[]): AddressableRng { return new AddressableRng(this.rootSeed, [this.path, ...parts].filter(Boolean).join("/")); }
  at(key: string): number {
    const input = `${this.rootSeed}|${this.path}|${key}`;
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) { hash ^= input.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return ((hash >>> 0) + 0.5) / 4294967296;
  }
  between(key: string, minimum: number, maximum: number): number { return minimum + this.at(key) * (maximum - minimum); }
}
