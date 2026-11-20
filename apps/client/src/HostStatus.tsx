import { useEffect, useState } from 'react';
import { parseHostMessage } from '@gpd4/protocol';
import { useT } from './i18n';

interface Info {
  port: number;
  skippedPorts: number[];
  lan: boolean;
  joinUrl: string;
}

type State = { kind: 'connecting' } | { kind: 'connected'; port: number } | { kind: 'offline' };

/** Shows that HTTP and the WebSocket both reach the host on the bound port (OPS-02). */
export function HostStatus() {
  const { t } = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<State>({ kind: 'connecting' });

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      fetch('/api/info')
        .then((r) =>
          r.ok ? (r.json() as Promise<Info>) : Promise.reject(new Error(String(r.status))),
        )
        .then((data) => {
          if (cancelled) return;
          setInfo(data);
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          ws = new WebSocket(`${proto}//${window.location.host}/ws`);
          ws.onmessage = (ev) => {
            const msg = parseHostMessage(String(ev.data));
            if (msg && !cancelled) setState({ kind: 'connected', port: msg.port });
          };
          ws.onclose = () => {
            if (cancelled) return;
            setState({ kind: 'offline' });
            retry = setTimeout(connect, 2000);
          };
        })
        .catch(() => {
          if (cancelled) return;
          setState({ kind: 'offline' });
          retry = setTimeout(connect, 2000);
        });
    };
    connect();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return (
    <section
      className="host-status"
      data-testid="host-status"
      data-state={state.kind}
      aria-live="polite"
    >
      <span className={`dot dot-${state.kind}`} aria-hidden="true" />
      <div>
        {state.kind === 'connecting' && <p>{t('host.connecting')}</p>}
        {state.kind === 'offline' && <p>{t('host.offline')}</p>}
        {state.kind === 'connected' && (
          <>
            <p data-testid="host-port">{t('host.connected', { port: state.port })}</p>
            {info && info.skippedPorts.length > 0 && (
              <p data-testid="host-skipped">
                {t('host.skipped', { ports: info.skippedPorts.join(', '), port: info.port })}
              </p>
            )}
            {info && (
              <p className="muted">
                {info.lan ? t('host.lanOn', { url: info.joinUrl }) : t('host.lanOff')}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
