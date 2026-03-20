const SVG_NS = 'http://www.w3.org/2000/svg';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createEyeSvg(pupilX: number): string {
  // 64x64, fondo transparente, ojo minimalista
  return `
<svg xmlns="${SVG_NS}" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#56d1ff"/>
      <stop offset="100%" stop-color="#2b66ff"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="32" rx="26" ry="18" fill="#111827"/>
  <ellipse cx="32" cy="32" rx="22" ry="14" fill="url(#g)"/>
  <circle cx="${pupilX}" cy="32" r="7" fill="#0b1020"/>
  <circle cx="${pupilX - 2}" cy="29" r="2" fill="#ffffff" fill-opacity="0.85"/>
</svg>`;
}

const IDLE_EYE = svgToDataUrl(createEyeSvg(32));
const ACTIVE_EYE_A = svgToDataUrl(createEyeSvg(28));
const ACTIVE_EYE_B = svgToDataUrl(createEyeSvg(36));

function ensureFaviconLink(): HTMLLinkElement {
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  return link;
}

export function setIdleFavicon(): void {
  const link = ensureFaviconLink();
  link.href = IDLE_EYE;
}

export function startActiveFavicon(): () => void {
  const link = ensureFaviconLink();
  let tick = false;
  link.href = ACTIVE_EYE_A;

  const interval = window.setInterval(() => {
    tick = !tick;
    link.href = tick ? ACTIVE_EYE_A : ACTIVE_EYE_B;
  }, 550);

  return () => {
    window.clearInterval(interval);
  };
}
