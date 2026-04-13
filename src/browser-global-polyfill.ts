const globalScope = globalThis as typeof globalThis & { global?: typeof globalThis };

if (typeof globalScope.global === 'undefined') {
  globalScope.global = globalScope;
}
