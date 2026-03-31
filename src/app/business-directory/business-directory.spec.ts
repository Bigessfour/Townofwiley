import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoggingService } from '../logging.service';
import { type CmsBusiness, LocalizedCmsContentStore } from '../site-cms-content';
import { BusinessDirectory } from './business-directory';

describe('BusinessDirectory', () => {
  it('keeps seeded businesses visible when CMS adds a new business', () => {
    const cmsBusinesses = signal<CmsBusiness[]>([
      {
        id: 'hangar-liquor-store',
        name: 'The Hangar Liquor Store',
        phone: '(719) 691-1913',
        address: '36001 US Hwy 287, Wiley, CO, United States, Colorado',
        website: 'https://www.facebook.com/p/The-Hangar-Liquor-Store-100057333045290/',
        description: 'Your Refreshment Headquarters',
        displayOrder: 1,
      },
    ]);

    TestBed.configureTestingModule({
      imports: [BusinessDirectory],
      providers: [
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            businesses: cmsBusinesses,
          } as unknown as LocalizedCmsContentStore,
        },
        {
          provide: LoggingService,
          useValue: {
            buttonClick: () => undefined,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(BusinessDirectory);
    fixture.detectChanges();

    const titles = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.public-directory-card h2'),
    ).map((element) => element.textContent?.trim());

    expect(titles).toContain('The Hangar Liquor Store');
    expect(titles).toContain('Tempel Grain');
  });

  it('sorts CMS businesses by display order before the seeded directory entries', () => {
    const cmsBusinesses = signal<CmsBusiness[]>([
      {
        id: 'z-business',
        name: 'Z Business',
        phone: '719-000-0000',
        address: 'Z Street, Wiley, CO',
        displayOrder: 20,
      },
      {
        id: 'a-business',
        name: 'A Business',
        phone: '719-111-1111',
        address: 'A Street, Wiley, CO',
        displayOrder: 5,
      },
    ]);

    TestBed.configureTestingModule({
      imports: [BusinessDirectory],
      providers: [
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            businesses: cmsBusinesses,
          } as unknown as LocalizedCmsContentStore,
        },
        {
          provide: LoggingService,
          useValue: {
            buttonClick: () => undefined,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(BusinessDirectory);
    fixture.detectChanges();

    const titles = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.public-directory-card h2'),
    ).map((element) => element.textContent?.trim());

    expect(titles.slice(0, 2)).toEqual(['A Business', 'Z Business']);
  });
});
