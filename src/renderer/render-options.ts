/**
 * Render options type definitions
 */

import { RenderOptions, BrowserConfig } from '../types';

/**
 * Default render options.
 *
 * `pixelRatio` is the single source of truth for output supersampling. The old
 * `quality` preset used to multiply the canvas by 2x/3x behind the user's back,
 * which silently turned a 1600x1050 design into a 4800x3150 capture.
 */
export const DEFAULT_RENDER_OPTIONS: Required<RenderOptions> = {
  width: 800,
  height: 600,
  background: '#ffffff',
  quality: 'medium',
  deviceScaleFactor: undefined as unknown as number,
  pixelRatio: 1,
};

/**
 * Default browser configuration
 */
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
    '--hide-scrollbars',
  ],
  timeout: 30000,
};

/**
 * Quality presets for rendering.
 *
 * The deviceScaleFactor values are kept for backwards compatibility, but the
 * renderer no longer applies them implicitly: output resolution is controlled
 * by `pixelRatio` and defaults to 1:1 with width x height.
 */
export const QUALITY_PRESETS: Record<
  NonNullable<RenderOptions['quality']>,
  { deviceScaleFactor: number; jpegQuality?: number; pngCompressionLevel?: number }
> = {
  low: {
    deviceScaleFactor: 1,
    jpegQuality: 60,
  },
  medium: {
    deviceScaleFactor: 2,
    jpegQuality: 80,
  },
  high: {
    deviceScaleFactor: 3,
    jpegQuality: 95,
  },
};

/**
 * Merge user options with defaults
 */
export function mergeRenderOptions(options?: Partial<RenderOptions>): Required<RenderOptions> {
  return {
    ...DEFAULT_RENDER_OPTIONS,
    ...options,
  };
}

/**
 * Merge browser config with defaults
 */
export function mergeBrowserConfig(config?: Partial<BrowserConfig>): BrowserConfig {
  return {
    ...DEFAULT_BROWSER_CONFIG,
    ...config,
  };
}
