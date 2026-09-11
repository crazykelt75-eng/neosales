'use client';

import { useEffect } from 'react';

const FONT_STYLESHEET_ID = 'neosales-font-stylesheet';
const FONT_STYLESHEET_HREF =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap';

/**
 * Loads the brand webfonts after hydration so the storefront never blocks
 * first paint on a third-party network request.
 *
 * The CSS declares `--font-jakarta` / `--font-mono` with `system-ui` fallbacks,
 * so text renders instantly and upgrades to Plus Jakarta Sans when the
 * stylesheet arrives. If the CDN is unreachable (offline demo, restricted
 * network) the layout simply keeps the fallback stack.
 */
export function FontLoader() {
  useEffect(() => {
    if (document.getElementById(FONT_STYLESHEET_ID)) return;

    const link = document.createElement('link');
    link.id = FONT_STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = FONT_STYLESHEET_HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}
