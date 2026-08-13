import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type ActivatedRouteSnapshot, type UrlTree } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { noticesToNewsGuard } from './notices-to-news.guard';

describe('noticesToNewsGuard', () => {
  it('redirects /notices to /news and keeps the notice fragment', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const router = TestBed.inject(Router);
    const tree = TestBed.runInInjectionContext(() =>
      noticesToNewsGuard(
        { fragment: 'notice-hydrant', queryParams: {} } as ActivatedRouteSnapshot,
        {} as never,
      ),
    ) as UrlTree;

    expect(router.serializeUrl(tree)).toBe('/news#notice-hydrant');
  });

  it('keeps staff preview and other query params', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const router = TestBed.inject(Router);
    const tree = TestBed.runInInjectionContext(() =>
      noticesToNewsGuard(
        {
          fragment: 'notice-hydrant',
          queryParams: { preview: '1' },
        } as unknown as ActivatedRouteSnapshot,
        {} as never,
      ),
    ) as UrlTree;

    expect(router.serializeUrl(tree)).toBe('/news?preview=1#notice-hydrant');
  });
});
