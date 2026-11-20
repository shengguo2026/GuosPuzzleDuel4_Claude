import { useMemo, useState } from 'react';
import { LOCALES, LOCALE_NAMES, translate, type Locale } from '@gpd4/content';
import { HostStatus } from './HostStatus';
import { LocaleContext, initialLocale, saveLocale, useT, type T } from './i18n';
import { ROUTES, findRoute, type RouteDef } from './routes';
import { navigate, usePath } from './router';

function Link({
  to,
  className,
  children,
  testId,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <a
      href={to}
      className={className}
      data-testid={testId}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function Dashboard() {
  const { t } = useT();
  return (
    <>
      <p className="tagline">{t('app.tagline')}</p>
      <nav className="cards" aria-label="Dashboard">
        {ROUTES.map((r) => (
          <Link key={r.id} to={r.path} className="card" testId={`nav-${r.id}`}>
            <span className="card-icon" style={{ background: r.color }} aria-hidden="true">
              {r.icon}
            </span>
            <span className="card-title">{t(r.title)}</span>
            <span className="card-desc">{t(r.desc)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

function Placeholder({ route }: { route: RouteDef }) {
  const { t } = useT();
  return (
    <section className="placeholder" data-testid={`page-${route.id}`}>
      <span className="card-icon big" style={{ background: route.color }} aria-hidden="true">
        {route.icon}
      </span>
      <h2>{t(route.title)}</h2>
      <p>{t(route.desc)}</p>
      <p className="muted">{t('placeholder.comingIn', { milestone: route.milestone })}</p>
      <Link to="/" className="button" testId="back">
        ← {t('nav.back')}
      </Link>
    </section>
  );
}

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const path = usePath();
  const route = findRoute(path);
  const ctx = useMemo(() => {
    const t: T = (key, params) => translate(locale, key, params);
    return { locale, t };
  }, [locale]);

  return (
    <LocaleContext.Provider value={ctx}>
      <div className="app" lang={locale === 'zh' ? 'zh-Hans' : locale}>
        <header className="top">
          <Link to="/" className="brand" testId="home">
            <h1>{ctx.t('app.title')}</h1>
          </Link>
          <label className="lang">
            <span>{ctx.t('nav.language')}</span>
            <select
              data-testid="language"
              value={locale}
              onChange={(e) => {
                const next = e.target.value as Locale;
                setLocale(next);
                saveLocale(next);
              }}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_NAMES[l]}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main>{route ? <Placeholder route={route} /> : <Dashboard />}</main>
        <footer>
          <HostStatus />
        </footer>
      </div>
    </LocaleContext.Provider>
  );
}
