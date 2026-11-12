/**
 * Path morphing utilities.
 *
 * The original implementation sampled raw command arguments as if they were
 * points, which produced invalid `d` strings for anything containing curves or
 * arcs. This module converts every path into cubic Bézier segments, resamples
 * the silhouette at equal arc length, aligns the starting point/orientation of
 * closed shapes, and emits a smooth cubic path for every in-between frame.
 */

export interface Point {
  x: number;
  y: number;
}

interface CubicSegment {
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
}

interface SubPath {
  segments: CubicSegment[];
  closed: boolean;
  start: Point;
}

interface NormalizedPath {
  points: Point[];
  closed: boolean;
}

const SAMPLE_COUNT = 128;
const EPSILON = 1e-6;

const normalizeCache = new Map<string, NormalizedPath | null>();
const pairCache = new Map<string, { a: Point[]; b: Point[]; closed: boolean } | null>();

function isCommand(token: string): boolean {
  return /^[MmLlHhVvCcSsQqTtAaZz]$/.test(token);
}

function isNumber(token: string | undefined): boolean {
  return token !== undefined && !isCommand(token);
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(a: Point, s: number): Point {
  return { x: a.x * s, y: a.y * s };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lineSegment(from: Point, to: Point): CubicSegment {
  const dx = (to.x - from.x) / 3;
  const dy = (to.y - from.y) / 3;
  return {
    p0: from,
    c1: { x: from.x + dx, y: from.y + dy },
    c2: { x: from.x + dx * 2, y: from.y + dy * 2 },
    p1: to,
  };
}

function cubicPoint(seg: CubicSegment, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * seg.p0.x + b * seg.c1.x + c * seg.c2.x + d * seg.p1.x,
    y: a * seg.p0.y + b * seg.c1.y + c * seg.c2.y + d * seg.p1.y,
  };
}

/**
 * Convert an SVG elliptical arc (endpoint parameterization) to cubic curves.
 */
function arcToCubics(
  from: Point,
  rxInput: number,
  ryInput: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  to: Point
): CubicSegment[] {
  let rx = Math.abs(rxInput);
  let ry = Math.abs(ryInput);

  if (rx < EPSILON || ry < EPSILON) {
    return [lineSegment(from, to)];
  }
  if (distance(from, to) < EPSILON) {
    return [];
  }

  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (from.x - to.x) / 2;
  const dy = (from.y - to.y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const factor = Math.sqrt(lambda);
    rx *= factor;
    ry *= factor;
  }

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;

  const numerator = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
  const denominator = rx2 * y1p2 + ry2 * x1p2;
  const sign = largeArc !== sweep ? 1 : -1;
  const coefficient = denominator < EPSILON ? 0 : sign * Math.sqrt(numerator / denominator);

  const cxp = (coefficient * (rx * y1p)) / ry;
  const cyp = (coefficient * (-ry * x1p)) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (from.x + to.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (from.y + to.y) / 2;

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  const theta1 = Math.atan2(uy, ux);
  let deltaTheta = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);

  if (!sweep && deltaTheta > 0) deltaTheta -= Math.PI * 2;
  if (sweep && deltaTheta < 0) deltaTheta += Math.PI * 2;

  const count = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
  const delta = deltaTheta / count;

  const pointAt = (angle: number): Point => ({
    x: cx + rx * Math.cos(angle) * cosPhi - ry * Math.sin(angle) * sinPhi,
    y: cy + rx * Math.cos(angle) * sinPhi + ry * Math.sin(angle) * cosPhi,
  });

  const derivativeAt = (angle: number): Point => ({
    x: -rx * Math.sin(angle) * cosPhi - ry * Math.cos(angle) * sinPhi,
    y: -rx * Math.sin(angle) * sinPhi + ry * Math.cos(angle) * cosPhi,
  });

  const result: CubicSegment[] = [];
  for (let i = 0; i < count; i++) {
    const a1 = theta1 + delta * i;
    const a2 = a1 + delta;
    const p0 = pointAt(a1);
    const p1 = pointAt(a2);
    const alpha = (4 / 3) * Math.tan(delta / 4);

    result.push({
      p0,
      c1: add(p0, scale(derivativeAt(a1), alpha)),
      c2: sub(p1, scale(derivativeAt(a2), alpha)),
      p1,
    });
  }

  return result;
}

/**
 * Parse an SVG path and flatten it into cubic Bézier subpaths.
 * Supports absolute and relative M/L/H/V/C/S/Q/T/A/Z commands.
 */
export function parsePathToCubics(d: string): SubPath[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  let index = 0;
  let command = '';
  let current: Point = { x: 0, y: 0 };
  let subStart: Point = { x: 0, y: 0 };
  let lastCubicControl: Point | null = null;
  let lastQuadraticControl: Point | null = null;

  let segments: CubicSegment[] = [];
  let closed = false;
  const subpaths: SubPath[] = [];

  const number = (): number => {
    const value = parseFloat(tokens[index++]);
    return Number.isFinite(value) ? value : 0;
  };
  const point = (relative: boolean): Point => {
    const x = number();
    const y = number();
    return relative ? { x: current.x + x, y: current.y + y } : { x, y };
  };
  const finish = (isClosed: boolean): void => {
    if (segments.length === 0) {
      return;
    }
    if (isClosed && distance(segments[segments.length - 1].p1, subStart) > 0.01) {
      segments.push(lineSegment(segments[segments.length - 1].p1, subStart));
    }
    subpaths.push({ segments, closed: isClosed, start: subStart });
    segments = [];
    closed = isClosed;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (isCommand(token)) {
      command = token;
      index++;
    } else if (!command) {
      break;
    }

    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();

    switch (upper) {
      case 'M': {
        if (segments.length > 0) finish(closed);
        current = point(relative);
        subStart = { ...current };
        closed = false;
        command = relative ? 'l' : 'L';
        // Additional coordinate pairs after moveto are implicit lineto commands.
        while (isNumber(tokens[index])) {
          const next = point(relative);
          segments.push(lineSegment(current, next));
          current = next;
        }
        break;
      }
      case 'L': {
        while (isNumber(tokens[index])) {
          const next = point(relative);
          segments.push(lineSegment(current, next));
          current = next;
        }
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'H': {
        while (isNumber(tokens[index])) {
          const x = number();
          const next = { x: relative ? current.x + x : x, y: current.y };
          segments.push(lineSegment(current, next));
          current = next;
        }
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'V': {
        while (isNumber(tokens[index])) {
          const y = number();
          const next = { x: current.x, y: relative ? current.y + y : y };
          segments.push(lineSegment(current, next));
          current = next;
        }
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'C': {
        while (isNumber(tokens[index])) {
          const c1 = point(relative);
          const c2 = point(relative);
          const p1 = point(relative);
          segments.push({ p0: { ...current }, c1, c2, p1 });
          current = p1;
          lastCubicControl = c2;
          lastQuadraticControl = null;
        }
        break;
      }
      case 'S': {
        while (isNumber(tokens[index])) {
          const c1 = lastCubicControl
            ? { x: current.x * 2 - lastCubicControl.x, y: current.y * 2 - lastCubicControl.y }
            : { ...current };
          const c2 = point(relative);
          const p1 = point(relative);
          segments.push({ p0: { ...current }, c1, c2, p1 });
          current = p1;
          lastCubicControl = c2;
          lastQuadraticControl = null;
        }
        break;
      }
      case 'Q': {
        while (isNumber(tokens[index])) {
          const q = point(relative);
          const p1 = point(relative);
          segments.push({
            p0: { ...current },
            c1: {
              x: current.x + ((q.x - current.x) * 2) / 3,
              y: current.y + ((q.y - current.y) * 2) / 3,
            },
            c2: {
              x: p1.x + ((q.x - p1.x) * 2) / 3,
              y: p1.y + ((q.y - p1.y) * 2) / 3,
            },
            p1,
          });
          current = p1;
          lastQuadraticControl = q;
          lastCubicControl = null;
        }
        break;
      }
      case 'T': {
        while (isNumber(tokens[index])) {
          const q: Point = lastQuadraticControl
            ? { x: current.x * 2 - lastQuadraticControl.x, y: current.y * 2 - lastQuadraticControl.y }
            : { ...current };
          const p1 = point(relative);
          segments.push({
            p0: { ...current },
            c1: {
              x: current.x + ((q.x - current.x) * 2) / 3,
              y: current.y + ((q.y - current.y) * 2) / 3,
            },
            c2: {
              x: p1.x + ((q.x - p1.x) * 2) / 3,
              y: p1.y + ((q.y - p1.y) * 2) / 3,
            },
            p1,
          });
          current = p1;
          lastQuadraticControl = q;
          lastCubicControl = null;
        }
        break;
      }
      case 'A': {
        while (isNumber(tokens[index])) {
          const rx = number();
          const ry = number();
          const rotation = number();
          const largeArc = number() !== 0;
          const sweep = number() !== 0;
          const p1 = point(relative);
          segments.push(...arcToCubics(current, rx, ry, rotation, largeArc, sweep, p1));
          current = p1;
        }
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case 'Z': {
        finish(true);
        current = { ...subStart };
        lastCubicControl = null;
        lastQuadraticControl = null;
        command = '';
        break;
      }
      default:
        index++;
        break;
    }
  }

  if (segments.length > 0) finish(closed);

  return subpaths;
}

function flatten(subpath: SubPath): Point[] {
  const points: Point[] = [];
  for (const segment of subpath.segments) {
    const length =
      distance(segment.p0, segment.c1) +
      distance(segment.c1, segment.c2) +
      distance(segment.c2, segment.p1);
    const steps = Math.max(6, Math.min(48, Math.ceil(length / 3)));
    for (let i = 0; i < steps; i++) {
      points.push(cubicPoint(segment, i / steps));
    }
  }
  if (subpath.segments.length > 0) {
    points.push(subpath.segments[subpath.segments.length - 1].p1);
  }
  return points;
}

function resampleByArcLength(points: Point[], closed: boolean, count: number): Point[] {
  if (points.length < 2) return points.slice();

  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
    lengths.push(total);
  }

  if (total < EPSILON) {
    return new Array(count).fill(points[0]);
  }

  const result: Point[] = [];
  const denominator = closed ? count : count - 1;
  let cursor = 0;

  for (let i = 0; i < count; i++) {
    const target = (total * i) / denominator;
    while (cursor < lengths.length - 2 && lengths[cursor + 1] < target) {
      cursor++;
    }
    const span = lengths[cursor + 1] - lengths[cursor];
    const t = span < EPSILON ? 0 : (target - lengths[cursor]) / span;
    const a = points[cursor];
    const b = points[Math.min(cursor + 1, points.length - 1)];
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }

  return result;
}

function signedArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function normalizePath(d: string): NormalizedPath | null {
  if (!d || typeof d !== 'string') return null;

  const subpaths = parsePathToCubics(d);
  if (subpaths.length === 0) return null;

  let primary = subpaths[0];
  let primaryArea = -1;
  for (const subpath of subpaths) {
    const sampled = flatten(subpath);
    const area = Math.abs(signedArea(sampled));
    if (area > primaryArea) {
      primaryArea = area;
      primary = subpath;
    }
  }

  if (primary.segments.length === 0) return null;

  const flattened = flatten(primary);
  const points = resampleByArcLength(flattened, primary.closed, SAMPLE_COUNT);
  if (points.length < 2) return null;

  return { points, closed: primary.closed };
}

function getNormalized(d: string): NormalizedPath | null {
  if (normalizeCache.has(d)) {
    return normalizeCache.get(d) ?? null;
  }
  const normalized = normalizePath(d);
  if (normalizeCache.size > 512) normalizeCache.clear();
  normalizeCache.set(d, normalized);
  return normalized;
}

function reverseClosed(points: Point[]): Point[] {
  // Keep the same starting vertex so that reversal alone does not add a
  // rotation; the alignment search handles rotation separately.
  const result = [points[0], ...points.slice(1).reverse()];
  return result;
}

function alignmentCost(a: Point[], b: Point[], offset: number): number {
  let cost = 0;
  for (let i = 0; i < a.length; i++) {
    const p = b[(i + offset) % b.length];
    const dx = a[i].x - p.x;
    const dy = a[i].y - p.y;
    cost += dx * dx + dy * dy;
  }
  return cost;
}

function alignClosed(a: Point[], b: Point[]): Point[] {
  let best = b;
  let bestCost = Infinity;

  for (const candidate of [b, reverseClosed(b)]) {
    for (let offset = 0; offset < candidate.length; offset++) {
      const cost = alignmentCost(a, candidate, offset);
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate.map((_, i) => candidate[(i + offset) % candidate.length]);
      }
    }
  }

  return best;
}

function getMorphPair(
  startD: string,
  endD: string
): { a: Point[]; b: Point[]; closed: boolean } | null {
  const key = `${startD}\u0000${endD}`;
  if (pairCache.has(key)) {
    return pairCache.get(key) ?? null;
  }

  const start = getNormalized(startD);
  const end = getNormalized(endD);
  if (!start || !end) {
    pairCache.set(key, null);
    return null;
  }

  const closed = start.closed && end.closed;
  let a = start.points;
  let b = end.points;

  if (closed) {
    if (Math.sign(signedArea(a)) !== Math.sign(signedArea(b))) {
      b = reverseClosed(b);
    }
    b = alignClosed(a, b);
  }

  const pair = { a, b, closed };
  if (pairCache.size > 256) pairCache.clear();
  pairCache.set(key, pair);
  return pair;
}

function formatPoint(point: Point): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}

/**
 * Emit a smooth cubic path through a point ring (closed) or polyline (open).
 */
export function pointsToSmoothPath(points: Point[], closed: boolean): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${formatPoint(points[0])}`;

  const n = points.length;
  const parts: string[] = [`M ${formatPoint(points[0])}`];

  if (closed) {
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const current = points[i];
      const next = points[(i + 1) % n];
      const after = points[(i + 2) % n];
      const c1 = {
        x: current.x + (next.x - prev.x) / 6,
        y: current.y + (next.y - prev.y) / 6,
      };
      const c2 = {
        x: next.x - (after.x - current.x) / 6,
        y: next.y - (after.y - current.y) / 6,
      };
      parts.push(`C ${formatPoint(c1)} ${formatPoint(c2)} ${formatPoint(next)}`);
    }
    parts.push('Z');
  } else {
    for (let i = 0; i < n - 1; i++) {
      const prev = points[Math.max(0, i - 1)];
      const current = points[i];
      const next = points[i + 1];
      const after = points[Math.min(n - 1, i + 2)];
      const c1 = {
        x: current.x + (next.x - prev.x) / 6,
        y: current.y + (next.y - prev.y) / 6,
      };
      const c2 = {
        x: next.x - (after.x - current.x) / 6,
        y: next.y - (after.y - current.y) / 6,
      };
      parts.push(`C ${formatPoint(c1)} ${formatPoint(c2)} ${formatPoint(next)}`);
    }
  }

  return parts.join(' ');
}

/**
 * Morph between two SVG path strings.
 * Returns the start path when parsing/morphing is not possible.
 */
export function morphPath(startD: string, endD: string, progress: number): string {
  if (!startD) return endD;
  if (!endD) return startD;
  if (startD === endD) return startD;

  const pair = getMorphPair(startD, endD);
  if (!pair) {
    return progress < 0.5 ? startD : endD;
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const points = pair.a.map((point, i) => ({
    x: point.x + (pair.b[i].x - point.x) * clamped,
    y: point.y + (pair.b[i].y - point.y) * clamped,
  }));

  return pointsToSmoothPath(points, pair.closed);
}
