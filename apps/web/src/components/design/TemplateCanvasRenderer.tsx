'use client';

import type { AspectRatio } from '@dagangai/shared';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { cn } from '@/lib/cn';

export interface DesignConfig {
  texts: {
    headline: string;
    subheadline: string;
    price_or_badge: string;
    cta: string;
  };
  colors: {
    background: string;
    accent: string;
    text: string;
  };
  font_preset: string;
  image?: {
    url?: string | null;
    crop?: {
      zoom: number;
      offset_x: number;
      offset_y: number;
    };
  } | null;
  logo_url?: string | null;
  show_logo: boolean;
  logo_position: 'top_left' | 'top_right' | 'bottom_left';
  show_badge: boolean;
}

export interface TemplateCanvasHandle {
  exportDataUrl: (format: 'png' | 'jpg', quality?: number) => string | null;
}

interface TemplateCanvasRendererProps {
  aspectRatio: AspectRatio;
  templateId: string;
  config: DesignConfig;
  className?: string;
}

function getDimensions(ratio: AspectRatio): { width: number; height: number } {
  if (ratio === '9:16') return { width: 1080, height: 1920 };
  if (ratio === '16:9') return { width: 1920, height: 1080 };
  return { width: 1080, height: 1080 };
}

function getFontFamily(preset: string): { heading: string; body: string } {
  if (preset === 'warm_artisan') {
    return { heading: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' };
  }
  if (preset === 'bold_promo') {
    return {
      heading: '"Plus Jakarta Sans", Impact, sans-serif',
      body: 'Inter, system-ui, sans-serif',
    };
  }
  return {
    heading: '"Plus Jakarta Sans", system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  };
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (!text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export const TemplateCanvasRenderer = forwardRef<
  TemplateCanvasHandle,
  TemplateCanvasRendererProps
>(function TemplateCanvasRenderer({ aspectRatio, templateId, config, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = getDimensions(aspectRatio);

  useImperativeHandle(ref, () => ({
    exportDataUrl(format, quality = 0.95) {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL(
        format === 'jpg' ? 'image/jpeg' : 'image/png',
        format === 'jpg' ? quality : undefined
      );
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImage = (src?: string | null): Promise<HTMLImageElement | null> =>
      new Promise((resolve) => {
        if (!src) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    Promise.all([loadImage(config.image?.url), loadImage(config.logo_url)]).then(
      ([productImg, logoImg]) => {
        if (cancelled) return;
        const { width: W, height: H } = dims;
        const fonts = getFontFamily(config.font_preset);

        // 1. Background
        ctx.fillStyle = config.colors.background || '#FAF8F5';
        ctx.fillRect(0, 0, W, H);

        // 2. Layout Photo Region
        const isSplit = aspectRatio === '16:9';
        const isStory = aspectRatio === '9:16';
        const photoBox = isSplit
          ? { x: W * 0.5, y: 0, w: W * 0.5, h: H }
          : isStory
            ? { x: 0, y: 0, w: W, h: H * 0.62 }
            : templateId.includes('clean')
              ? { x: 64, y: 64, w: W - 128, h: H * 0.5 }
              : { x: 0, y: 0, w: W, h: H * 0.56 };

        ctx.save();
        drawRoundedRect(
          ctx,
          photoBox.x,
          photoBox.y,
          photoBox.w,
          photoBox.h,
          templateId.includes('clean') ? 24 : 0
        );
        ctx.clip();

        if (productImg) {
          const zoom = config.image?.crop?.zoom ?? 1;
          const offX = (config.image?.crop?.offset_x ?? 0) * 10;
          const offY = (config.image?.crop?.offset_y ?? 0) * 10;
          const scale =
            Math.max(photoBox.w / productImg.width, photoBox.h / productImg.height) * zoom;
          const dw = productImg.width * scale;
          const dh = productImg.height * scale;
          const dx = photoBox.x + (photoBox.w - dw) / 2 + offX;
          const dy = photoBox.y + (photoBox.h - dh) / 2 + offY;
          ctx.drawImage(productImg, dx, dy, dw, dh);
        } else {
          ctx.fillStyle = '#E5DFD6';
          ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
          ctx.fillStyle = '#78716C';
          ctx.font = `600 32px ${fonts.body}`;
          ctx.textAlign = 'center';
          ctx.fillText(
            'Foto Produk',
            photoBox.x + photoBox.w / 2,
            photoBox.y + photoBox.h / 2
          );
          ctx.textAlign = 'left';
        }
        ctx.restore();

        // Gradient overlay for Story
        if (isStory) {
          const grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.55, config.colors.background);
          ctx.fillStyle = grad;
          ctx.fillRect(0, H * 0.4, W, H * 0.6);
        }

        // 3. Text Block Region
        const pad = 72;
        const textX = pad;
        const textMaxW = isSplit ? W * 0.5 - pad * 1.5 : W - pad * 2;
        let cursorY = isSplit ? 140 : isStory ? H * 0.64 : H * 0.61;

        // Price / Badge Pill
        if (config.show_badge && config.texts.price_or_badge.trim()) {
          ctx.font = `700 30px ${fonts.body}`;
          const badgeText = config.texts.price_or_badge.trim();
          const bw = Math.min(textMaxW, ctx.measureText(badgeText).width + 56);
          ctx.fillStyle = config.colors.accent;
          drawRoundedRect(ctx, textX, cursorY, bw, 60, 999);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(badgeText, textX + 28, cursorY + 40);
          cursorY += 86;
        }

        // Headline
        ctx.fillStyle = config.colors.text;
        ctx.font = `700 ${isStory ? 64 : 56}px ${fonts.heading}`;
        const hLines = wrapTextLines(ctx, config.texts.headline, textMaxW, 2);
        for (const line of hLines) {
          ctx.fillText(line, textX, cursorY + 52);
          cursorY += isStory ? 76 : 66;
        }
        cursorY += 18;

        // Subheadline
        if (config.texts.subheadline.trim()) {
          ctx.font = `400 ${isStory ? 36 : 32}px ${fonts.body}`;
          ctx.globalAlpha = 0.85;
          const sLines = wrapTextLines(ctx, config.texts.subheadline, textMaxW, 3);
          for (const line of sLines) {
            ctx.fillText(line, textX, cursorY + 34);
            cursorY += 44;
          }
          ctx.globalAlpha = 1;
        }

        // CTA Button
        if (config.texts.cta.trim()) {
          const ctaY = isSplit ? H - 140 : H - 130;
          ctx.font = `600 30px ${fonts.body}`;
          const ctaText = config.texts.cta.trim();
          const cw = Math.min(textMaxW, ctx.measureText(ctaText).width + 64);
          ctx.fillStyle = config.colors.accent;
          drawRoundedRect(ctx, textX, ctaY, cw, 68, 16);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(ctaText, textX + 32, ctaY + 44);
        }

        // 4. Optional Business Logo
        if (config.show_logo && logoImg) {
          const logoSize = 96;
          const lx =
            config.logo_position === 'top_right' ? W - logoSize - 48 : 48;
          const ly =
            config.logo_position === 'bottom_left' ? H - logoSize - 48 : 48;
          ctx.save();
          drawRoundedRect(ctx, lx, ly, logoSize, logoSize, 20);
          ctx.clip();
          ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
          ctx.restore();
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [aspectRatio, templateId, config, dims]);

  return (
    <canvas
      ref={canvasRef}
      width={dims.width}
      height={dims.height}
      className={cn(
        'mx-auto block max-h-[38vh] w-auto max-w-full rounded-[10px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] md:max-h-[540px]',
        className
      )}
    />
  );
});
