/**
 * SVG Motion — DeepSeek Harness plugin.
 *
 * Exposes one host tool that turns an SVG (CSS/SMIL or keyframe-driven) into a
 * deterministic GIF, MP4 or WebM through the library's frame pipeline.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineTool, ToolArgsError } from '@deepseek-ai/dsh-tools';
import * as core from '../../dist/index.js';

const MAX_DIMENSION = 4096;
const MAX_FRAMES = 1200;
const MAX_RENDER_PIXELS = 24_000_000;

type Format = 'gif' | 'mp4' | 'webm';

interface RenderArgs {
  svg?: string;
  input?: string;
  output: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  background?: string;
  quality?: 'low' | 'medium' | 'high';
  pixelRatio?: number;
  preserveNativeAnimations?: boolean;
  animations?: unknown;
  chromePath?: string;
  keepFrames?: boolean;
}

interface RenderValue {
  output: string;
  format: Format;
  width: number;
  height: number;
  fps: number;
  frames: number;
  durationMs: number;
  bytes: number;
  renderMs: number;
  framesDir?: string;
}

const parameters = {
  svg: {
    type: 'string',
    description:
      'Complete inline SVG markup. Provide exactly one of svg or input. CSS @keyframes and SMIL animations inside it are preserved and seeked per frame.',
  },
  input: {
    type: 'string',
    description:
      'Path to an .svg file. Provide exactly one of svg or input.',
  },
  output: {
    type: 'string',
    required: true,
    description:
      'Output file path ending in .gif, .mp4 or .webm. Relative paths resolve against the working directory; parent directories are created.',
  },
  width: {
    type: 'number',
    description:
      'Output width in pixels. Defaults to the SVG width (or is derived from height and the SVG aspect ratio).',
  },
  height: {
    type: 'number',
    description:
      'Output height in pixels. Defaults to the SVG height (or is derived from width and the SVG aspect ratio).',
  },
  fps: {
    type: 'number',
    description: 'Frames per second, 1–60. Defaults to 25.',
  },
  duration: {
    type: 'number',
    description:
      'Animation length in milliseconds, 100–60000. Defaults to 4000. For seamless loops make every animation period divide this value.',
  },
  background: {
    type: 'string',
    description: 'CSS background color behind the SVG. Defaults to #ffffff.',
  },
  quality: {
    type: 'string',
    enum: ['low', 'medium', 'high'],
    description:
      'Encoding quality for MP4/WebM (CRF). Does not change output resolution or GIF size. Defaults to medium.',
  },
  pixelRatio: {
    type: 'number',
    description:
      'Supersampling factor for captured frames, 0.25–4. Defaults to 1, so the encoded file is exactly width × height.',
  },
  preserveNativeAnimations: {
    type: 'boolean',
    description:
      'Keep CSS @keyframes and SMIL animations from the SVG (default true). Set false to strip them and use only the animations argument.',
  },
  animations: {
    type: 'json',
    description:
      'Optional array of AnimationConfig objects ({ targets, keyframes, easing }) applied by the keyframe engine on top of the SVG. Keyframe properties may include transform, opacity, d, fill, stroke, strokeDashoffset, strokeWidth, etc.',
  },
  chromePath: {
    type: 'string',
    description:
      'Chrome/Chromium executable for frame capture. Defaults to PUPPETEER_EXECUTABLE_PATH, then a detected system browser.',
  },
  keepFrames: {
    type: 'boolean',
    description:
      'Keep the rendered PNG frames after encoding (default false). The temporary directory is returned as framesDir.',
  },
} as const;

function fail(violation: string): never {
  throw new ToolArgsError([violation]);
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) fail(`${name}: expected a finite number`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function detectChrome(explicit?: string): string | undefined {
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!isFile(resolved)) {
      fail(`chromePath: no executable file at ${resolved}`);
    }
    return resolved;
  }

  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv && isFile(fromEnv)) return fromEnv;

  const candidates: string[] = [];
  if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    );
  } else if (process.platform === 'win32') {
    const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(
      (value): value is string => Boolean(value)
    );
    for (const root of roots) {
      candidates.push(
        path.join(root, 'Google/Chrome/Application/chrome.exe'),
        path.join(root, 'Microsoft/Edge/Application/msedge.exe')
      );
    }
  } else {
    const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
    for (const dir of (process.env.PATH || '').split(':')) {
      if (!dir) continue;
      for (const name of names) candidates.push(path.join(dir, name));
    }
  }

  return candidates.find(isFile);
}

function parseAnimations(value: unknown): core.AnimationConfig[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    fail('animations: expected an array of AnimationConfig objects');
  }
  return value as core.AnimationConfig[];
}

function resolveFormat(output: string): Format {
  const extension = path.extname(output).toLowerCase();
  if (extension === '.gif') return 'gif';
  if (extension === '.mp4') return 'mp4';
  if (extension === '.webm') return 'webm';
  fail('output: expected a .gif, .mp4 or .webm file extension');
}

function resolveDimensions(
  parsed: core.ParsedSVG,
  requestedWidth: number | undefined,
  requestedHeight: number | undefined
): { width: number; height: number } {
  const naturalWidth = parsed.width > 0 ? parsed.width : 800;
  const naturalHeight = parsed.height > 0 ? parsed.height : 600;

  let width = requestedWidth;
  let height = requestedHeight;
  if (width === undefined && height === undefined) {
    width = naturalWidth;
    height = naturalHeight;
  } else if (width === undefined) {
    width = (height as number) * (naturalWidth / naturalHeight);
  } else if (height === undefined) {
    height = width * (naturalHeight / naturalWidth);
  }

  width = Math.round(width as number);
  height = Math.round(height as number);
  if (width < 16 || width > MAX_DIMENSION) fail(`width: expected 16–${MAX_DIMENSION}, got ${width}`);
  if (height < 16 || height > MAX_DIMENSION) fail(`height: expected 16–${MAX_DIMENSION}, got ${height}`);
  return { width, height };
}

const renderTool = defineTool({
  name: 'svg_motion_render',
  description:
    'Render an SVG into a deterministic animated GIF, MP4 or WebM. Preserves CSS @keyframes and SMIL animations by seeking them to each frame, so output is reproducible and loops seamlessly. Accepts inline SVG or an .svg path, and an optional AnimationConfig array. Use for README hero loops, animated diagrams, explainers and social clips. Duration is in milliseconds; frames default to width × height from the SVG.',
  parameters,
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        output: { type: 'string', required: true },
        format: { type: 'string', enum: ['gif', 'mp4', 'webm'], required: true },
        width: { type: 'number', required: true },
        height: { type: 'number', required: true },
        fps: { type: 'number', required: true },
        frames: { type: 'number', required: true },
        durationMs: { type: 'number', required: true },
        bytes: { type: 'number', required: true },
        renderMs: { type: 'number', required: true },
        framesDir: { type: 'string' },
      },
    },
    render: (_args: RenderArgs, value: RenderValue) => {
      const media = `${value.width}×${value.height} · ${value.fps} fps · ${value.frames} frames · ${(
        value.durationMs / 1000
      ).toFixed(2)}s`;
      const frames = value.framesDir ? `\nFrames: ${value.framesDir}` : '';
      return [
        {
          type: 'text',
          text: `Rendered ${value.format.toUpperCase()} — ${media}\nOutput: ${value.output} (${formatBytes(
            value.bytes
          )})${frames}`,
        },
      ];
    },
  },
  timeoutMs: 10 * 60 * 1000,
  isConcurrencySafe: () => false,
  async execute(args: RenderArgs, exec: { signal?: AbortSignal }): Promise<RenderValue> {
    if (exec?.signal?.aborted) throw new Error('svg_motion_render aborted before rendering');
    if (Boolean(args.svg) === Boolean(args.input)) {
      fail('svg / input: provide exactly one of inline svg or input file path');
    }

    const output = path.resolve(args.output);
    const format = resolveFormat(output);

    let svgContent: string;
    if (args.svg) {
      svgContent = args.svg;
    } else {
      const inputPath = path.resolve(args.input as string);
      if (!isFile(inputPath)) fail(`input: file not found at ${inputPath}`);
      svgContent = fs.readFileSync(inputPath, 'utf8');
    }

    if (!/<svg[\s>]/i.test(svgContent)) {
      fail('svg / input: content does not contain an <svg> root element');
    }

    let parsed: core.ParsedSVG;
    try {
      parsed = core.parseSVG(svgContent);
    } catch (error) {
      fail(`svg / input: could not parse SVG (${error instanceof Error ? error.message : String(error)})`);
    }

    const { width, height } = resolveDimensions(parsed, args.width, args.height);
    const fps = args.fps ?? 25;
    const duration = args.duration ?? 4000;
    const pixelRatio = args.pixelRatio ?? 1;

    assertFinite(fps, 'fps');
    assertFinite(duration, 'duration');
    assertFinite(pixelRatio, 'pixelRatio');
    if (fps < 1 || fps > 60) fail(`fps: expected 1–60, got ${fps}`);
    if (duration < 100 || duration > 60_000) fail(`duration: expected 100–60000 ms, got ${duration}`);
    if (pixelRatio < 0.25 || pixelRatio > 4) fail(`pixelRatio: expected 0.25–4, got ${pixelRatio}`);

    const frames = Math.ceil((fps * duration) / 1000);
    if (frames < 2) fail(`duration / fps: would render ${frames} frame(s); increase duration or fps`);
    if (frames > MAX_FRAMES) {
      fail(`duration / fps: would render ${frames} frames; maximum is ${MAX_FRAMES}`);
    }
    if (width * height * pixelRatio * pixelRatio > MAX_RENDER_PIXELS) {
      fail(
        `width / height / pixelRatio: ${width}×${height} at ${pixelRatio}× exceeds the ${MAX_RENDER_PIXELS.toLocaleString()} pixel capture budget`
      );
    }

    const animations = parseAnimations(args.animations);
    const chromePath = detectChrome(args.chromePath);
    fs.mkdirSync(path.dirname(output), { recursive: true });

    const started = Date.now();
    const pipeline = new core.SVGAnimationPipeline({
      input: svgContent,
      output,
      fps,
      duration,
      width,
      height,
      background: args.background ?? '#ffffff',
      quality: args.quality ?? 'medium',
      pixelRatio,
      preserveNativeAnimations: args.preserveNativeAnimations ?? true,
      executablePath: chromePath,
      keepFrames: args.keepFrames ?? false,
    });
    if (animations.length > 0) pipeline.addAnimations(animations);

    let result: core.RenderResult;
    try {
      result = await pipeline.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`svg_motion_render failed: ${message}`);
    }

    if (exec?.signal?.aborted) throw new Error('svg_motion_render aborted after rendering');

    const bytes = fs.statSync(output).size;
    const actualDurationMs = Math.round((result.frames / fps) * 1000);
    const value: RenderValue = {
      output,
      format,
      width,
      height,
      fps,
      frames: result.frames,
      durationMs: actualDurationMs,
      bytes,
      renderMs: Date.now() - started,
    };
    if (args.keepFrames) value.framesDir = pipeline.getTempDir();
    return value;
  },
});

export const name = 'svg-motion';
export const inject = ['tools'];

interface PluginContext {
  tools: {
    register(definition: unknown): unknown;
  };
}

export function apply(ctx: PluginContext): void {
  ctx.tools.register(renderTool);
}
