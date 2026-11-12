/**
 * Puppeteer Renderer - Render SVG frames using headless Chrome
 */

import * as path from 'path';
import * as fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';
import {
  RenderOptions,
  BrowserConfig,
  FrameData,
} from '../types';
import {
  mergeRenderOptions,
  mergeBrowserConfig,
} from './render-options';

export interface PuppeteerRendererOptions {
  render?: Partial<RenderOptions>;
  browser?: Partial<BrowserConfig>;
  tempDir?: string;
  /** Explicit Chrome/Chromium binary. Falls back to PUPPETEER_EXECUTABLE_PATH. */
  executablePath?: string;
}

/**
 * Puppeteer-based frame renderer
 */
export class PuppeteerRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private options: Required<RenderOptions>;
  private browserConfig: BrowserConfig;
  private tempDir: string;
  private initialized: boolean = false;
  private outputScale: number;
  private executablePath?: string;

  constructor(options?: PuppeteerRendererOptions) {
    this.options = mergeRenderOptions(options?.render);
    this.browserConfig = mergeBrowserConfig(options?.browser);
    this.tempDir = options?.tempDir || path.join(process.cwd(), '.svg-anim-temp');
    this.executablePath = options?.executablePath;
    this.outputScale = this.resolveOutputScale();
  }

  /**
   * Resolve the supersampling factor.
   *
   * `pixelRatio` wins, then an explicit `deviceScaleFactor`. The `quality`
   * preset no longer multiplies the canvas implicitly.
   */
  private resolveOutputScale(): number {
    const requested = this.options.pixelRatio ?? this.options.deviceScaleFactor ?? 1;
    if (!Number.isFinite(requested) || requested <= 0) return 1;
    return Math.min(Math.max(requested, 0.25), 4);
  }

  setTempDir(dir: string): void {
    this.tempDir = dir;
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Initialize browser and page
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    const executablePath = this.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    try {
      this.browser = await puppeteer.launch({
        headless: this.browserConfig.headless,
        args: this.browserConfig.args,
        timeout: this.browserConfig.timeout,
        executablePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        'Failed to launch Chrome for SVG rendering. ' +
        'Install a browser with `npx puppeteer browsers install chrome`, or set ' +
        'PUPPETEER_EXECUTABLE_PATH to a local Chrome/Chromium binary. ' +
        `Underlying error: ${message}`
      );
    }

    this.page = await this.browser.newPage();

    // The viewport is the logical canvas. deviceScaleFactor is the only
    // multiplication applied, and it is explicit.
    await this.page.setViewport({
      width: this.options.width,
      height: this.options.height,
      deviceScaleFactor: this.outputScale,
    });

    // Disable external resources so a render is reproducible offline.
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      const url = request.url();
      if (
        (url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('//')) &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
      ) {
        request.abort();
        return;
      }
      request.continue();
    });

    this.initialized = true;
  }

  /**
   * Get the current page instance
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Renderer not initialized. Call initialize() first.');
    }
    return this.page;
  }

  /**
   * Load SVG content into the page
   */
  async loadSVG(svgContent: string, cssStyles?: string): Promise<void> {
    const page = this.getPage();

    const html = this.createHTMLDocument(svgContent, cssStyles);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Fonts must be ready before frame 0 or text pops between frames.
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    // Freeze CSS/SMIL timelines; each frame seeks them explicitly.
    await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg')) as SVGSVGElement[];
      for (const svg of svgs) {
        try {
          svg.pauseAnimations();
          svg.setCurrentTime(0);
        } catch {
          // Not a root SVG (or SMIL unsupported) - CSS still obeys seek below.
        }
      }
      if (typeof document.getAnimations === 'function') {
        for (const animation of document.getAnimations()) {
          try {
            animation.pause();
            animation.currentTime = 0;
          } catch {
            // Ignore individual animations that cannot be seeked.
          }
        }
      }
    });
  }

  /**
   * Create HTML document wrapper for SVG
   */
  private createHTMLDocument(svg: string, css?: string): string {
    const wrappedSvg = this.normalizeRootSvg(svg);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SVG Animation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      overflow: hidden;
      background: ${this.options.background};
    }
    body { position: relative; }
    svg {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    ${css || ''}
  </style>
</head>
<body>
  ${wrappedSvg}
</body>
</html>
    `.trim();
  }

  /**
   * Replace (not blindly prepend) the root SVG dimensions.
   *
   * The old implementation inserted `width`/`height` before the existing ones,
   * producing duplicate attributes and accidentally overriding the design's
   * intrinsic aspect ratio.
   */
  private normalizeRootSvg(svg: string): string {
    return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
      const cleaned = attrs
        .replace(/\swidth\s*=\s*("[^"]*"|'[^']*')/gi, '')
        .replace(/\sheight\s*=\s*("[^"]*"|'[^']*')/gi, '');
      return `<svg${cleaned} width="${this.options.width}" height="${this.options.height}">`;
    });
  }

  /**
   * Apply animation state to SVG elements
   */
  async applyState(stateScript: string): Promise<void> {
    await this.getPage().evaluate(stateScript);
  }

  /**
   * Initialize DOM element cache for animated selectors (run once after SVG load)
   */
  async initCache(initCacheScript: string): Promise<void> {
    await this.getPage().evaluate(initCacheScript);
  }

  /**
   * Seek every animation timeline to an exact time.
   *
   * Native CSS animations and SMIL both run on wall-clock time by default,
   * which makes frame capture jitter and loops non-reproducible. Pausing and
   * setting `currentTime` gives deterministic, exactly-loopable frames.
   */
  async seekAnimations(timeMs: number): Promise<void> {
    await this.getPage().evaluate((time: number) => {
      if (typeof document.getAnimations === 'function') {
        const animations = document.getAnimations();
        for (const animation of animations) {
          try {
            animation.pause();
            animation.currentTime = time;
          } catch {
            // Ignore individual animations that cannot be seeked.
          }
        }
      }

      const svgs = Array.from(document.querySelectorAll('svg')) as SVGSVGElement[];
      for (const svg of svgs) {
        try {
          svg.pauseAnimations();
          svg.setCurrentTime(time / 1000);
        } catch {
          // Ignore non-SMIL SVGs.
        }
      }
    }, timeMs);
  }

  /**
   * Wait until the frame after the one we just mutated has been painted.
   */
  private async waitForPaint(): Promise<void> {
    await this.getPage().evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        })
    );
  }

  /**
   * Render a single frame using optimized cached element references
   */
  async renderFrameOptimized(time: number, optimizedScript: string): Promise<FrameData> {
    const page = this.getPage();

    await page.evaluate(optimizedScript);
    await this.seekAnimations(time);
    await this.waitForPaint();

    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: {
        x: 0,
        y: 0,
        width: this.options.width,
        height: this.options.height,
      },
      captureBeyondViewport: false,
    });

    return {
      time,
      index: Math.round(time),
      buffer: buffer as Buffer,
    };
  }

  /**
   * Apply state and return frame data
   */
  async renderFrame(time: number, stateScript: string): Promise<FrameData> {
    const page = this.getPage();

    await page.evaluate(stateScript);
    await this.seekAnimations(time);
    await this.waitForPaint();

    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: {
        x: 0,
        y: 0,
        width: this.options.width,
        height: this.options.height,
      },
      captureBeyondViewport: false,
    });

    return {
      time,
      index: Math.round(time),
      buffer: buffer as Buffer,
    };
  }

  /**
   * Render multiple frames
   */
  async renderFrames(
    fps: number,
    duration: number,
    stateGenerator: (time: number) => string,
    onProgress?: (frame: number, total: number) => void
  ): Promise<FrameData[]> {
    const totalFrames = Math.ceil((fps * duration) / 1000);
    const interval = 1000 / fps;
    const frames: FrameData[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const time = i * interval;
      const stateScript = stateGenerator(time);

      try {
        const frame = await this.renderFrameWithRetry(time, stateScript);
        frames.push(frame);
        onProgress?.(i + 1, totalFrames);
      } catch (error) {
        console.error(`Failed to render frame ${i} after retries:`, error);
        throw error;
      }
    }

    return frames;
  }

  /**
   * Render a single frame with retry logic
   */
  private async renderFrameWithRetry(
    time: number,
    stateScript: string,
    maxRetries: number = 3
  ): Promise<FrameData> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          await this.ensurePageValid();
        }

        return await this.renderFrame(time, stateScript);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100;
          console.warn(`Frame render failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.sleep(delay);
          await this.ensurePageValid();
        }
      }
    }

    throw lastError || new Error('Frame render failed after max retries');
  }

  /**
   * Ensure page is still valid, recreate if needed
   */
  private async ensurePageValid(): Promise<void> {
    if (!this.page || !this.browser) {
      await this.initialize();
      return;
    }

    try {
      await this.page.title();
    } catch {
      console.warn('Page became invalid, recreating...');
      await this.close();
      await this.initialize();
    }
  }

  /**
   * Save frame to disk
   */
  async saveFrame(frame: FrameData, filename: string): Promise<string> {
    const filepath = path.join(this.tempDir, filename);

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    if (frame.buffer) {
      await fs.promises.writeFile(filepath, frame.buffer);
    } else if (frame.path) {
      await fs.promises.copyFile(frame.path, filepath);
    }

    return filepath;
  }

  /**
   * Save frames to numbered PNG files
   */
  async saveFrames(frames: FrameData[], prefix: string = 'frame'): Promise<string[]> {
    const paths: string[] = [];

    for (let i = 0; i < frames.length; i++) {
      const filename = `${prefix}${String(i).padStart(5, '0')}.png`;
      const filepath = await this.saveFrame(frames[i], filename);
      paths.push(filepath);
    }

    return paths;
  }

  /**
   * Get temp directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Get the effective output scale (pixelRatio / deviceScaleFactor).
   */
  getOutputScale(): number {
    return this.outputScale;
  }

  /**
   * Clean up temp directory
   */
  async cleanup(): Promise<void> {
    if (!fs.existsSync(this.tempDir)) return;
    await fs.promises.rm(this.tempDir, { recursive: true, force: true });
  }

  /**
   * Close browser and page
   */
  async close(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch {
        // Page may already be closed.
      }
      this.page = null;
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Browser may already be closed.
      }
      this.browser = null;
    }

    this.initialized = false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a renderer with default options
 */
export function createRenderer(options?: PuppeteerRendererOptions): PuppeteerRenderer {
  return new PuppeteerRenderer(options);
}
