import { useEffect, useState } from 'react';

/** Minimal history router: clean URLs, the host serves the shell for each. */
export function navigate(path: string): void {
  if (path === window.location.pathname) return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}
