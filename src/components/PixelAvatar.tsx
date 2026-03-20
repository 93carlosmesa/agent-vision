import { useMemo } from 'react';

interface PixelAvatarProps {
  seed: string;
  size?: number;
}

type Palette = {
  body: string;
  skin: string;
  hair: string;
  shoes: string;
};

const PALETTES: Palette[] = [
  { body: '#f59e0b', skin: '#d6a67a', hair: '#3b2a1f', shoes: '#5b3a29' },
  { body: '#3b82f6', skin: '#e0b48a', hair: '#2d1f17', shoes: '#374151' },
  { body: '#8b5cf6', skin: '#d9aa84', hair: '#4a3728', shoes: '#334155' },
  { body: '#22c55e', skin: '#c99264', hair: '#2f231d', shoes: '#3f3f46' },
];

function hashOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawAvatar(ctx: CanvasRenderingContext2D, palette: Palette) {
  ctx.clearRect(0, 0, 16, 16);

  // body / tunic
  drawRect(ctx, 4, 7, 8, 6, palette.body);

  // head
  drawRect(ctx, 5, 2, 6, 5, palette.skin);

  // hair + eyes
  drawRect(ctx, 5, 2, 6, 2, palette.hair);
  drawRect(ctx, 6, 4, 1, 1, '#111827');
  drawRect(ctx, 9, 4, 1, 1, '#111827');

  // arms
  drawRect(ctx, 2, 8, 2, 4, palette.skin);
  drawRect(ctx, 12, 8, 2, 4, palette.skin);

  // legs + shoes
  drawRect(ctx, 5, 13, 2, 2, palette.shoes);
  drawRect(ctx, 9, 13, 2, 2, palette.shoes);
}

export function PixelAvatar({ seed, size = 54 }: PixelAvatarProps) {
  const dataUrl = useMemo(() => {
    const index = hashOf(seed) % PALETTES.length;
    const palette = PALETTES[index];

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.imageSmoothingEnabled = false;
    drawAvatar(ctx, palette);
    return canvas.toDataURL('image/png');
  }, [seed]);

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated' }}
      alt="Agent avatar"
    />
  );
}
