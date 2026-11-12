/**
 * SVG Animator - Interpolate SVG element properties based on keyframes
 */

import {
  Keyframe,
  AnimationConfig,
  AnimatableProperties,
  EasingType,
  InterpolatedProperties,
  TransformValue,
  PathMorphValue,
} from '../types';
import { getEasing, interpolate, interpolateColor } from './easing';
import { getKeyframePair, normalizeKeyframes } from './keyframe';
import { morphPath } from './path-morph';

/**
 * Interpolated state for a single element
 */
export interface ElementState {
  selector: string;
  properties: InterpolatedProperties;
}

type PropertyValue = string | number | TransformValue | undefined;

/**
 * Main animator class
 */
export class SVGAnimator {
  private animations: AnimationConfig[] = [];
  private totalDuration: number = 0;
  private layerMap: Map<string, AnimationConfig[]> = new Map();

  /**
   * Add an animation configuration
   */
  addAnimation(config: AnimationConfig): this {
    this.animations.push(config);
    this.totalDuration = Math.max(
      this.totalDuration,
      ...config.keyframes.map((kf) => kf.time)
    );

    // Track animated selectors for layer awareness
    const selectors = Array.isArray(config.targets) ? config.targets : [config.targets];
    for (const selector of selectors) {
      const existing = this.layerMap.get(selector);
      if (existing) {
        existing.push(config);
      } else {
        this.layerMap.set(selector, [config]);
      }
    }

    return this;
  }

  /**
   * Add multiple animations at once
   */
  addAnimations(configs: AnimationConfig[]): this {
    for (const config of configs) {
      this.addAnimation(config);
    }
    return this;
  }

  /**
   * Get total animation duration
   */
  getDuration(): number {
    return this.totalDuration;
  }

  /**
   * Compute the state of all animated elements at a given time
   */
  computeState(time: number): ElementState[] {
    const states: ElementState[] = [];

    for (const animation of this.animations) {
      const selectors = Array.isArray(animation.targets)
        ? animation.targets
        : [animation.targets];

      for (const selector of selectors) {
        const properties = this.interpolateProperties(animation, time);
        states.push({ selector, properties });
      }
    }

    return states;
  }

  /**
   * Interpolate properties for a single animation at a given time
   */
  private interpolateProperties(
    animation: AnimationConfig,
    time: number
  ): InterpolatedProperties {
    const keyframes = normalizeKeyframes(animation.keyframes, animation.easing || 'linear');
    const { start, end, progress } = getKeyframePair(keyframes, time);

    if (!end) {
      return this.serializeProperties(start.properties);
    }

    // Apply easing to progress
    const easingFn = getEasing(end.easing || animation.easing || 'linear');
    const easedProgress = easingFn(progress);

    // Interpolate each property
    const result: InterpolatedProperties = {};

    for (const key of Object.keys(start.properties)) {
      const startValue = start.properties[key];
      const endValue = end.properties[key];

      if (startValue === undefined && endValue === undefined) {
        continue;
      }

      if (key === 'd') {
        const isFirst = start === keyframes[0];
        const startPath = this.resolvePath(startValue, isFirst);
        const endPath = this.resolvePath(endValue, false);

        if (startPath && endPath) {
          result.d = morphPath(startPath, endPath, easedProgress);
        } else if (endPath) {
          result.d = endPath;
        } else if (startPath) {
          result.d = startPath;
        }
        continue;
      }

      if (startValue === undefined) {
        result[key] = this.serializeValue(endValue);
        continue;
      }

      if (endValue === undefined) {
        result[key] = this.serializeValue(startValue);
        continue;
      }

      result[key] = this.interpolateValue(key, startValue, endValue, easedProgress);
    }

    // A property may only exist on the destination keyframe (e.g. an object
    // added mid-animation). Keep it visible instead of dropping it.
    for (const key of Object.keys(end.properties)) {
      if (result[key] !== undefined) continue;
      const value = end.properties[key];
      if (value !== undefined) {
        result[key] = key === 'd'
          ? this.resolvePath(value, false)
          : this.serializeValue(value);
      }
    }

    return result;
  }

  /**
   * Resolve a keyframe's path value.
   *
   * `d: { start, end }` is a morph descriptor. The first keyframe uses its
   * `start` state; later keyframes use their `end` state so that successive
   * descriptors chain naturally (`circle->star`, then `star->circle`).
   */
  private resolvePath(value: unknown, isFirst: boolean): string | undefined {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
      const morph = value as PathMorphValue;
      if (isFirst && morph.start !== morph.end) return morph.start;
      return morph.end ?? morph.start;
    }
    return undefined;
  }

  /**
   * Interpolate a single property value
   */
  private interpolateValue(
    key: string,
    start: unknown,
    end: unknown,
    progress: number
  ): PropertyValue {
    // Handle transform specially. Returning a structured value lets the
    // browser resolve the element's bounding-box center for rotation/scale.
    if (key === 'transform') {
      return this.interpolateTransform(
        start as TransformValue,
        end as TransformValue,
        progress
      );
    }

    // Handle color interpolation
    if ((key === 'fill' || key === 'stroke') && typeof start === 'string' && typeof end === 'string') {
      return interpolateColor(start, end, progress);
    }

    // Handle color objects
    if (
      (key === 'fill' || key === 'stroke') &&
      typeof start === 'object' &&
      typeof end === 'object'
    ) {
      return interpolateColor(
        start as unknown as string,
        end as unknown as string,
        progress
      );
    }

    // Handle numeric interpolation
    if (typeof start === 'number' && typeof end === 'number') {
      return interpolate(start, end, progress);
    }

    // Handle strings that look like numbers
    if (typeof start === 'string' && typeof end === 'string') {
      const startNum = parseFloat(start);
      const endNum = parseFloat(end);
      if (!isNaN(startNum) && !isNaN(endNum)) {
        return interpolate(startNum, endNum, progress);
      }
    }

    // Fallback: use end value
    return this.serializeValue(end);
  }

  /**
   * Interpolate transform values.
   *
   * Rotation and uniform scale are expressed without an origin; the renderer
   * expands them around each element's bounding-box center. Explicit
   * `[angle, cx, cy]` rotations stay untouched for deliberate pivots.
   */
  private interpolateTransform(
    start: TransformValue | undefined,
    end: TransformValue | undefined,
    progress: number
  ): TransformValue {
    const s = start || {};
    const e = end || {};
    const result: TransformValue = {};

    // Translate: hold the defined value when only one side supplies it.
    if (s.translate || e.translate) {
      const from = s.translate ?? e.translate ?? [0, 0];
      const to = e.translate ?? from;
      result.translate = [
        interpolate(from[0], to[0], progress),
        interpolate(from[1], to[1], progress),
      ];
    }

    // Rotate
    if (s.rotate !== undefined || e.rotate !== undefined) {
      const from = s.rotate ?? e.rotate;
      const to = e.rotate ?? from;
      if (typeof from === 'number' && typeof to === 'number') {
        result.rotate = interpolate(from, to, progress);
      } else if (Array.isArray(from) && Array.isArray(to)) {
        result.rotate = [
          interpolate(from[0], to[0], progress),
          interpolate(from[1] ?? 0, to[1] ?? 0, progress),
          interpolate(from[2] ?? 0, to[2] ?? 0, progress),
        ];
      } else {
        result.rotate = to;
      }
    }

    // Scale
    if (s.scale !== undefined || e.scale !== undefined) {
      const from = s.scale ?? e.scale;
      const to = e.scale ?? from;
      if (typeof from === 'number' && typeof to === 'number') {
        result.scale = interpolate(from, to, progress);
      } else if (Array.isArray(from) && Array.isArray(to)) {
        result.scale = [
          interpolate(from[0], to[0], progress),
          interpolate(from[1] ?? from[0], to[1] ?? to[0], progress),
        ];
      } else if (Array.isArray(to)) {
        result.scale = to;
      } else {
        result.scale = to;
      }
    }

    if (s.skewX !== undefined || e.skewX !== undefined) {
      result.skewX = interpolate(s.skewX ?? e.skewX ?? 0, e.skewX ?? s.skewX ?? 0, progress);
    }
    if (s.skewY !== undefined || e.skewY !== undefined) {
      result.skewY = interpolate(s.skewY ?? e.skewY ?? 0, e.skewY ?? s.skewY ?? 0, progress);
    }

    return result;
  }

  /**
   * Serialize properties for a keyframe with no following keyframe.
   */
  private serializeProperties(props: AnimatableProperties): InterpolatedProperties {
    const result: InterpolatedProperties = {};

    for (const [key, value] of Object.entries(props)) {
      result[key] = this.serializeValue(value);
    }

    return result;
  }

  /**
   * Serialize a single value
   */
  private serializeValue(value: unknown): PropertyValue {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if ('r' in value && 'g' in value && 'b' in value) {
        const c = value as { r: number; g: number; b: number; a?: number };
        return c.a !== undefined ? `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` : `rgb(${c.r}, ${c.g}, ${c.b})`;
      }
      if ('start' in value && 'end' in value) {
        return (value as PathMorphValue).start;
      }
      if ('translate' in value || 'rotate' in value || 'scale' in value || 'skewX' in value || 'skewY' in value) {
        return value as TransformValue;
      }
    }
    return String(value);
  }

  /**
   * Generate JavaScript code to apply animation state to SVG.
   */
  generateApplyScript(states: ElementState[]): string {
    return this.buildApplyScript(states, false);
  }

  /**
   * Get list of all animated CSS selectors
   */
  getAnimatedSelectors(): string[] {
    return Array.from(this.layerMap.keys());
  }

  /**
   * Get all registered animations
   */
  getAnimations(): AnimationConfig[] {
    return [...this.animations];
  }

  /**
   * Generate script to cache animated DOM element references (run once).
   * Also records the element's authored transform so animated transforms
   * compose with it instead of replacing it.
   */
  generateInitCacheScript(): string {
    const selectors = JSON.stringify(this.getAnimatedSelectors());

    return `
      (function() {
        window.__animCache = window.__animCache || {};
        var selectors = ${selectors};
        selectors.forEach(function(sel) {
          try {
            var els = document.querySelectorAll(sel);
            var value = els.length === 1 ? els[0] : Array.prototype.slice.call(els);
            window.__animCache[sel] = value;
            Array.prototype.forEach.call(els, function(el) {
              if (el.__svgAnimBaseTransform === undefined) {
                el.__svgAnimBaseTransform = el.getAttribute('transform') || '';
              }
            });
          } catch (error) {
            window.__animCache[sel] = [];
          }
        });
      })();
    `;
  }

  /**
   * Generate optimized per-frame script using cached element references.
   */
  generateOptimizedApplyScript(states: ElementState[]): string {
    return this.buildApplyScript(states, true);
  }

  /**
   * Shared per-frame applier.
   *
   * Presentation properties are written to inline CSS (class rules otherwise
   * override SVG presentation attributes), attribute-only values use the SVG
   * attribute name, and transforms compose with the authored `transform`.
   */
  private buildApplyScript(states: ElementState[], useCache: boolean): string {
    const stateJson = JSON.stringify(
      states.map((s) => ({ selector: s.selector, properties: s.properties }))
    );

    return `
      (function() {
        var cache = window.__animCache || {};
        var states = ${stateJson};
        var GEOMETRY = {
          d: 1, transform: 1, x: 1, y: 1, x1: 1, y1: 1, x2: 1, y2: 1,
          width: 1, height: 1, r: 1, rx: 1, ry: 1, cx: 1, cy: 1,
          points: 1, offset: 1, viewBox: 1, pathLength: 1, href: 1
        };
        var LENGTHS = { 'stroke-width': 1, 'stroke-dashoffset': 1, 'font-size': 1, 'letter-spacing': 1 };

        function cssName(key) {
          return key.replace(/[A-Z]/g, function(m) { return '-' + m.toLowerCase(); });
        }

        function formatValue(key, value) {
          if (typeof value === 'number' && LENGTHS[key]) {
            return value + 'px';
          }
          return String(value);
        }

        function buildTransform(el, t) {
          var parts = [];
          if (t.translate) {
            parts.push('translate(' + t.translate[0] + ',' + t.translate[1] + ')');
          }

          var bbox = null;
          var needsCenter = (t.rotate !== undefined && !Array.isArray(t.rotate)) || t.scale !== undefined;
          if (needsCenter) {
            try { bbox = el.getBBox(); } catch (error) { bbox = null; }
          }
          var cx = bbox ? bbox.x + bbox.width / 2 : 0;
          var cy = bbox ? bbox.y + bbox.height / 2 : 0;

          if (t.rotate !== undefined) {
            if (Array.isArray(t.rotate)) {
              parts.push('rotate(' + t.rotate[0] + ',' + t.rotate[1] + ',' + t.rotate[2] + ')');
            } else {
              parts.push('rotate(' + t.rotate + ',' + cx + ',' + cy + ')');
            }
          }

          if (t.scale !== undefined) {
            if (Array.isArray(t.scale)) {
              parts.push('translate(' + cx + ',' + cy + ') scale(' + t.scale[0] + ',' + t.scale[1] + ') translate(' + (-cx) + ',' + (-cy) + ')');
            } else {
              parts.push('translate(' + cx + ',' + cy + ') scale(' + t.scale + ') translate(' + (-cx) + ',' + (-cy) + ')');
            }
          }

          if (t.skewX !== undefined) parts.push('skewX(' + t.skewX + ')');
          if (t.skewY !== undefined) parts.push('skewY(' + t.skewY + ')');

          return parts.join(' ');
        }

        function applyProps(el, props) {
          for (var key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            var value = props[key];
            if (value === undefined || value === null) continue;

            if (key === 'transform') {
              if (el.__svgAnimBaseTransform === undefined) {
                el.__svgAnimBaseTransform = el.getAttribute('transform') || '';
              }
              var base = el.__svgAnimBaseTransform;
              var transform = buildTransform(el, value);
              el.setAttribute('transform', base ? (base + ' ' + transform) : transform);
              continue;
            }

            if (key === 'd') {
              if (typeof value === 'string') el.setAttribute('d', value);
              continue;
            }

            var name = cssName(key);
            if (GEOMETRY[key]) {
              el.setAttribute(key, String(value));
            } else {
              el.style.setProperty(name, formatValue(name, value));
            }
          }
        }

        states.forEach(function(state) {
          var elements;
          if (${useCache ? 'true' : 'false'}) {
            var cached = cache[state.selector];
            if (cached) {
              elements = Array.isArray(cached) ? cached : [cached];
            }
          }
          if (!elements || elements.length === 0) {
            try {
              elements = Array.prototype.slice.call(document.querySelectorAll(state.selector));
            } catch (error) {
              elements = [];
            }
            if (${useCache ? 'true' : 'false'}) {
              cache[state.selector] = elements.length === 1 ? elements[0] : elements;
            }
          }

          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (!el) continue;
            if (el.__svgAnimBaseTransform === undefined) {
              el.__svgAnimBaseTransform = el.getAttribute('transform') || '';
            }
            applyProps(el, state.properties);
          }
        });
      })();
    `;
  }
}
