import type { MegaMenuItem } from 'primeng/api';
import type { AppCopy } from '../app-copy';
import { WEATHER_ALERT_SIGNUP_FRAGMENT } from '../app-copy';
import { megaMenuColumn } from './mega-menu-column';

/** Pure mega-menu tree from bundled/overridden site copy. */
export function buildMegaMenuItems(copy: AppCopy): MegaMenuItem[] {
  return [
    {
      root: true,
      label: copy.menuQuickTasksLabel,
      icon: 'pi pi-list',
      items: [
        megaMenuColumn(
          [
            {
              label: copy.mobileOnlinePaymentsLabel,
              routerLink: '/pay-bill',
            },
            {
              label: copy.mobileIssueLabel,
              routerLink: ['/services'],
              fragment: 'issue-report',
            },
            {
              label: copy.meetingsQuickLinkLabel,
              routerLink: '/meetings',
              fragment: 'calendar',
            },
            {
              label: copy.communityCalendarQuickLinkLabel,
              routerLink: '/meetings',
              fragment: 'community',
            },
            {
              label: copy.mobileSearchAllServicesLabel,
              routerLink: ['/'],
              fragment: 'search-panel',
            },
          ],
          copy.menuQuickTasksServicesColumnLabel,
        ),
        megaMenuColumn(
          [
            { label: copy.featureTitles.weather, routerLink: '/weather', icon: 'pi pi-cloud' },
            { label: copy.nwsAlertLabel, routerLink: '/weather' },
            {
              label: copy.mobileWeatherAlertsLabel,
              routerLink: '/weather',
              fragment: WEATHER_ALERT_SIGNUP_FRAGMENT,
            },
            { label: copy.openCalendarLabel, routerLink: '/meetings', fragment: 'calendar' },
            {
              label: copy.communityCalendarQuickLinkLabel,
              routerLink: '/meetings',
              fragment: 'community',
              icon: 'pi pi-calendar-plus',
            },
          ],
          copy.menuQuickTasksWeatherColumnLabel,
        ),
      ],
    },
    {
      root: true,
      label: copy.menuGovernmentLabel,
      icon: 'pi pi-building',
      items: [
        megaMenuColumn(
          [
            {
              label: copy.featureTitles.meetings,
              routerLink: '/meetings',
              icon: 'pi pi-calendar',
            },
            { label: copy.calendarKicker, routerLink: '/meetings', fragment: 'calendar' },
            {
              label: copy.communityCalendarQuickLinkLabel,
              routerLink: '/meetings',
              fragment: 'community',
              icon: 'pi pi-calendar-plus',
            },
            { label: copy.featureTitles.records, routerLink: '/meetings', icon: 'pi pi-folder' },
          ],
          copy.menuGovernmentMeetingsColumnLabel,
        ),
        megaMenuColumn(
          [
            { label: copy.transparencyKicker, routerLink: '/contact' },
            { label: copy.featureTitles.accessibility, routerLink: '/accessibility' },
            { label: copy.menuLeadershipLabel, routerLink: '/contact', fragment: 'leadership' },
          ],
          copy.menuGovernmentTownColumnLabel,
        ),
      ],
    },
    {
      root: true,
      label: copy.menuServicesPermitsLabel,
      icon: 'pi pi-briefcase',
      items: [
        megaMenuColumn(
          [
            {
              label: copy.mobileOnlinePaymentsLabel,
              routerLink: '/pay-bill',
            },
            { label: copy.mobileIssueLabel, routerLink: ['/services'], fragment: 'issue-report' },
            { label: copy.featureTitles.services, routerLink: '/services' },
          ],
          copy.menuServicesPermitsLabel,
        ),
        megaMenuColumn(
          [
            { label: copy.featureTitles.records, routerLink: '/meetings' },
            { label: copy.openCalendarLabel, routerLink: '/meetings', fragment: 'calendar' },
          ],
          copy.menuServicesRelatedColumnLabel,
        ),
      ],
    },
    {
      root: true,
      label: copy.menuNewsNoticesLabel,
      icon: 'pi pi-bell',
      items: [
        megaMenuColumn([
          { label: copy.featureTitles.news, routerLink: '/news', icon: 'pi pi-newspaper' },
        ]),
        megaMenuColumn([
          { label: copy.nwsAlertLabel, routerLink: '/weather' },
          {
            label: copy.alertActionLabel,
            routerLink: '/weather',
            fragment: WEATHER_ALERT_SIGNUP_FRAGMENT,
          },
        ]),
      ],
    },
    {
      root: true,
      label: copy.menuWeatherLabel,
      icon: 'pi pi-cloud',
      routerLink: '/weather',
    },
    {
      root: true,
      label: copy.menuBusinessCommunityLabel,
      icon: 'pi pi-users',
      items: [
        megaMenuColumn([
          {
            label: copy.menuBusinessDirectoryLabel,
            routerLink: '/businesses',
            icon: 'pi pi-building',
          },
          {
            label: copy.featureTitles.history,
            routerLink: '/history',
            icon: 'pi pi-book',
          },
        ]),
      ],
    },
    {
      root: true,
      label: copy.menuContactHallLabel,
      icon: 'pi pi-envelope',
      routerLink: '/contact',
    },
  ];
}
