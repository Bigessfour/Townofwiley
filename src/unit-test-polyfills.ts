/**
 * Loaded as build polyfills before `init-testbed.js` in `ng test`.
 * Vitest browser mode needs the JIT compiler for partially-linked @angular/common.
 */
import '@angular/compiler';
