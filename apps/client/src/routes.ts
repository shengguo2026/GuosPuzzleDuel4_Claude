import type { MessageKey } from '@gpd4/content';

/** Every dashboard route of the GDD (UI-02), with the milestone that fills it. */
export interface RouteDef {
  id: string;
  path: string;
  title: MessageKey;
  desc: MessageKey;
  milestone: string;
  icon: string;
  color: string;
}

export const ROUTES: readonly RouteDef[] = [
  {
    id: 'play',
    path: '/play',
    title: 'route.play',
    desc: 'route.play.desc',
    milestone: 'M2a',
    icon: '▶',
    color: '#ff7a3d',
  },
  {
    id: 'campaign',
    path: '/campaign',
    title: 'route.campaign',
    desc: 'route.campaign.desc',
    milestone: 'M5',
    icon: '⚑',
    color: '#3ecf6e',
  },
  {
    id: 'challenges',
    path: '/challenges',
    title: 'route.challenges',
    desc: 'route.challenges.desc',
    milestone: 'M5',
    icon: '✦',
    color: '#f2c230',
  },
  {
    id: 'local-vs',
    path: '/local-vs',
    title: 'route.localVs',
    desc: 'route.localVs.desc',
    milestone: 'M2a',
    icon: '⌨',
    color: '#e2475b',
  },
  {
    id: 'wifi-vs',
    path: '/wifi-vs',
    title: 'route.wifiVs',
    desc: 'route.wifiVs.desc',
    milestone: 'M3',
    icon: '📶',
    color: '#2fa8e0',
  },
  {
    id: 'profiles',
    path: '/profiles',
    title: 'route.profiles',
    desc: 'route.profiles.desc',
    milestone: 'M4',
    icon: '☺',
    color: '#9b6bff',
  },
  {
    id: 'store',
    path: '/store',
    title: 'route.store',
    desc: 'route.store.desc',
    milestone: 'M4',
    icon: '◆',
    color: '#ff5fa2',
  },
  {
    id: 'museum',
    path: '/museum',
    title: 'route.museum',
    desc: 'route.museum.desc',
    milestone: 'M5',
    icon: '🏛',
    color: '#c98b4a',
  },
  {
    id: 'statistics',
    path: '/statistics',
    title: 'route.statistics',
    desc: 'route.statistics.desc',
    milestone: 'M4',
    icon: '▤',
    color: '#36c7b5',
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'route.settings',
    desc: 'route.settings.desc',
    milestone: 'M6',
    icon: '⚙',
    color: '#8a96ad',
  },
];

export function findRoute(path: string): RouteDef | undefined {
  const clean = path.replace(/\/+$/, '') || '/';
  return ROUTES.find((r) => r.path === clean);
}
