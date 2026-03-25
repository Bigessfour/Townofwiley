import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider } from '@angular/core';

const testProviders: Provider[] = [provideHttpClient(), provideHttpClientTesting()];

export default testProviders;
