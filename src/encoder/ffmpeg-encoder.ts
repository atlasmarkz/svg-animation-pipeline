/**
 * FFmpeg Encoder - Encode frame sequences to GIF/video
 */

import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { OutputFormat, EncodeOptions, GIFOptions, VideoOptions } from '../types';

// Resolve the bundled ffmpeg binary. npm sometimes skips the postinstall chmod
// (for example when install scripts are disabled), leaving a non-executable
// file behind.
const ffmpegBinary = process.env.FFMPEG_PATH || ffmpegPath.path;
try {
  fs.accessSync(ffmpegBinary, fs.constants.X_OK);
} catch {
  try {
    fs.chmodSync(ffmpegBinary, 0o755);
  } catch {
    // Let ffmpeg fail with its own, more descriptive error.
  }
}
ffmpeg.setFfmpegPath(ffmpegBinary);

if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

export interface EncoderResult {
  output: string;
  format: OutputFormat;
  success: boolean;
  duration: number;
}

interface FrameInput {
  pattern: string;
  startNumber: number;
  single: boolean;
}

/**
 * FFmpeg-based video encoder
 */
export class FFmpegEncoder {
  private tempDir: string;
  private outputDir: string;

  constructor(tempDir?: string, outputDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), '.svg-anim-temp');
    this.outputDir = outputDir || process.cwd();
  }

  /**
   * Encode frame sequence to GIF with palette optimization
   */
  async encodeGIF(
    framePaths: string[],
    outputPath: string,
    fps: number = 30,
    options?: Partial<GIFOptions>
  ): Promise<EncoderResult> {
    this.assertFrames(framePaths);

    const startTime = Date.now();
    const finalOutput = this.resolveOutput(outputPath);
    const input = this.buildFrameInput(framePaths);

    if (options?.palette !== false) {
      await this.encodeGIFWithPalette(input, finalOutput, fps, options?.colors);
    } else {
      await this.encodeGIFSimple(input, finalOutput, fps);
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      output: finalOutput,
      format: 'gif',
      success: true,
      duration,
    };
  }

  /**
   * Encode GIF with a single palette generated across the whole sequence.
   *
   * `stats_mode=diff` biases palette colors toward pixels that actually change,
   * and `sierra2_4a` avoids the visible cross-hatch that bayer dithering leaves
   * on gradients.
   */
  private async encodeGIFWithPalette(
    input: FrameInput,
    outputPath: string,
    fps: number,
    colors: number = 256
  ): Promise<void> {
    const palettePath = path.join(this.tempDir, `palette-${Date.now()}.png`);
    const maxColors = Math.min(Math.max(Math.round(colors), 2), 256);

    try {
      await this.runCommand((cmd) =>
        this.addFrameInput(cmd, input, fps)
          .outputOptions([
            '-vf',
            `palettegen=stats_mode=diff:max_colors=${maxColors}`,
            '-y',
          ])
          .output(palettePath)
      );

      await this.runCommand((cmd) =>
        this.addFrameInput(cmd, input, fps)
          .input(palettePath)
          .outputOptions([
            '-filter_complex',
            '[0:v][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle[out]',
            '-map',
            '[out]',
            '-loop',
            '0',
            '-y',
          ])
          .output(outputPath)
      );
    } finally {
      if (fs.existsSync(palettePath)) {
        await fs.promises.unlink(palettePath).catch(() => undefined);
      }
    }
  }

  /**
   * Encode GIF without a custom palette.
   */
  private async encodeGIFSimple(
    input: FrameInput,
    outputPath: string,
    fps: number
  ): Promise<void> {
    await this.runCommand((cmd) =>
      this.addFrameInput(cmd, input, fps)
        .outputOptions(['-loop', '0', '-y'])
        .output(outputPath)
    );
  }

  /**
   * Encode frame sequence to MP4 video
   */
  async encodeMP4(
    framePaths: string[],
    outputPath: string,
    fps: number = 30,
    options?: Partial<VideoOptions>
  ): Promise<EncoderResult> {
    this.assertFrames(framePaths);

    const startTime = Date.now();
    const finalOutput = this.resolveOutput(outputPath);
    const input = this.buildFrameInput(framePaths);

    const codec = options?.codec || 'libx264';
    const crf = this.qualityToCrf(options?.quality, 18);
    const videoOptions = [
      `-c:v`, codec,
      '-preset', 'slow',
      ...(options?.bitrate ? ['-b:v', options.bitrate] : ['-crf', String(crf)]),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-r', String(fps),
      '-an',
      '-y',
    ];

    await this.runCommand((cmd) =>
      this.addFrameInput(cmd, input, fps)
        .outputOptions(videoOptions)
        .output(finalOutput)
    );

    const duration = (Date.now() - startTime) / 1000;

    return {
      output: finalOutput,
      format: 'mp4',
      success: true,
      duration,
    };
  }

  /**
   * Encode frame sequence to WebM video
   */
  async encodeWebM(
    framePaths: string[],
    outputPath: string,
    fps: number = 30,
    options?: Partial<VideoOptions>
  ): Promise<EncoderResult> {
    this.assertFrames(framePaths);

    const startTime = Date.now();
    const finalOutput = this.resolveOutput(outputPath);
    const input = this.buildFrameInput(framePaths);
    const crf = this.qualityToCrf(options?.quality, 30);

    await this.runCommand((cmd) =>
      this.addFrameInput(cmd, input, fps)
        .outputOptions([
          '-c:v', 'libvpx-vp9',
          '-crf', String(crf),
          '-b:v', options?.bitrate || '0',
          '-row-mt', '1',
          '-deadline', 'good',
          '-cpu-used', '2',
          '-pix_fmt', 'yuv420p',
          '-r', String(fps),
          '-an',
          '-y',
        ])
        .output(finalOutput)
    );

    const duration = (Date.now() - startTime) / 1000;

    return {
      output: finalOutput,
      format: 'webm',
      success: true,
      duration,
    };
  }

  /**
   * Encode with format auto-detection from extension
   */
  async encode(
    framePaths: string[],
    outputPath: string,
    fps: number = 30,
    options?: Partial<EncodeOptions>
  ): Promise<EncoderResult> {
    const ext = path.extname(outputPath).toLowerCase();

    switch (ext) {
      case '.gif':
        return this.encodeGIF(framePaths, outputPath, fps, options as Partial<GIFOptions>);
      case '.mp4':
        return this.encodeMP4(framePaths, outputPath, fps, options as Partial<VideoOptions>);
      case '.webm':
        return this.encodeWebM(framePaths, outputPath, fps, options as Partial<VideoOptions>);
      default:
        throw new Error(`Unsupported output format: ${ext}`);
    }
  }

  private assertFrames(framePaths: string[]): void {
    if (!framePaths || framePaths.length === 0) {
      throw new Error('No frames to encode');
    }

    for (const frame of framePaths) {
      if (!fs.existsSync(frame)) {
        throw new Error(`Frame not found: ${frame}`);
      }
    }
  }

  /**
   * Derive an ffmpeg image sequence pattern from the actual frame paths.
   *
   * The previous implementation always read `<tempDir>/frame%05d.png`,
   * ignoring the paths it was given. This version validates that the supplied
   * frames really are a consecutive sequence and preserves the exact numbering.
   */
  private buildFrameInput(framePaths: string[]): FrameInput {
    if (framePaths.length === 1) {
      return { pattern: framePaths[0], startNumber: 0, single: true };
    }

    const first = framePaths[0];
    const match = path.basename(first).match(/^(.*?)(\d+)(\.[^.]+)$/);
    if (!match) {
      throw new Error(
        `Frame filenames must end in a number (got ${path.basename(first)}).`
      );
    }

    const [, prefix, digits, extension] = match;
    const width = digits.length;
    const startNumber = parseInt(digits, 10);
    const pattern = path.join(
      path.dirname(first),
      `${prefix}%0${width}d${extension}`
    );

    for (let i = 0; i < framePaths.length; i++) {
      const expected = path.join(
        path.dirname(first),
        `${prefix}${String(startNumber + i).padStart(width, '0')}${extension}`
      );
      if (path.resolve(framePaths[i]) !== path.resolve(expected)) {
        throw new Error(
          'Frames must be a consecutive numbered sequence for encoding. ' +
          `Expected ${expected}, received ${framePaths[i]}.`
        );
      }
    }

    return { pattern, startNumber, single: false };
  }

  private addFrameInput(
    cmd: ffmpeg.FfmpegCommand,
    input: FrameInput,
    fps: number
  ): ffmpeg.FfmpegCommand {
    if (input.single) {
      return cmd.input(input.pattern);
    }

    return cmd
      .input(input.pattern)
      .inputOptions([
        '-framerate', String(fps),
        '-start_number', String(input.startNumber),
      ]);
  }

  private qualityToCrf(
    quality: EncodeOptions['quality'] | undefined,
    highQualityCrf: number
  ): number {
    switch (quality) {
      case 'low':
        return highQualityCrf + 7;
      case 'medium':
        return highQualityCrf + 3;
      default:
        return highQualityCrf;
    }
  }

  private resolveOutput(outputPath: string): string {
    const finalOutput = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(this.outputDir, outputPath);
    fs.mkdirSync(path.dirname(finalOutput), { recursive: true });
    return finalOutput;
  }

  /**
   * Run ffmpeg command with promise wrapper
   */
  private runCommand(
    setup: (cmd: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = setup(ffmpeg());
      cmd.on('end', () => resolve());
      cmd.on('error', (err, stdout, stderr) => {
        const stderrTail = (stderr || '').trim().split('\n').slice(-12).join('\n');
        console.error('FFmpeg error:', err.message);
        if (stderrTail) console.error(stderrTail);
        reject(new Error(`${err.message}${stderrTail ? `\n${stderrTail}` : ''}`));
      });
      cmd.run();
    });
  }

  /**
   * Get video info (duration, resolution, etc.)
   */
  async getVideoInfo(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
  } | null> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err || !metadata) {
          resolve(null);
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          resolve(null);
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFrameRate(videoStream.r_frame_rate),
        });
      });
    });
  }

  private parseFrameRate(rate: string | undefined): number {
    if (!rate) return 0;
    const [numerator, denominator] = rate.split('/').map(Number);
    if (!Number.isFinite(numerator)) return 0;
    if (!denominator || !Number.isFinite(denominator)) return numerator;
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Clean up temporary files (keep final output)
   */
  async cleanupTempFiles(keepFrames: boolean = false): Promise<void> {
    if (keepFrames) return;
    if (!fs.existsSync(this.tempDir)) return;
    if (path.resolve(this.tempDir) === path.resolve(process.cwd())) return;
    await fs.promises.rm(this.tempDir, { recursive: true, force: true });
  }
}

/**
 * Create encoder instance
 */
export function createEncoder(tempDir?: string, outputDir?: string): FFmpegEncoder {
  return new FFmpegEncoder(tempDir, outputDir);
}
