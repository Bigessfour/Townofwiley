import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';

function noop(): void {
	return;
}

class NoopResizeObserver {
	observe(): void {
		noop();
	}

	unobserve(): void {
		noop();
	}

	disconnect(): void {
		noop();
	}
}

const resizeObserverConstructor = NoopResizeObserver as unknown as typeof ResizeObserver;

if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = resizeObserverConstructor;
}

if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
	window.ResizeObserver = resizeObserverConstructor;
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
	HTMLElement.prototype.scrollIntoView = () => {
		noop();
	};
}

const testProviders: (Provider | EnvironmentProviders)[] = [provideHttpClient(), provideHttpClientTesting()];

export default testProviders;
