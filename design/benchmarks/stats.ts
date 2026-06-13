/**
 * stats.ts — ベンチ集計の純関数（runner から分離してテスト可能にする）
 *
 * P1-4 Slice 2: 3 条件（cold / designmd / full）× N トライアルの分布を
 * mean±range で集計し、条件間の限界寄与（lift）を出す。
 * Atlassian「context engine で +52%」式の「DS を足すと準拠スコアが何点上がるか」を
 * 自前の一次データとして提示するための土台。
 */

export interface Summary {
  n: number;
  mean: number;
  min: number;
  max: number;
  stdev: number;
}

export function summarize(scores: number[]): Summary {
  if (scores.length === 0) {
    return { n: 0, mean: 0, min: 0, max: 0, stdev: 0 };
  }
  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  return { n, mean, min, max, stdev };
}

export interface Lift {
  /** 絶対差（point） */
  abs: number;
  /** 相対上昇率（%）。base が 0 のときは null */
  pct: number | null;
}

/** base 条件に対する target 条件の限界寄与 */
export function computeLift(baseMean: number, targetMean: number): Lift {
  const abs = targetMean - baseMean;
  const pct = baseMean === 0 ? null : (abs / baseMean) * 100;
  return { abs, pct };
}

/** mean を 1 桁、range を "min–max" で整形 */
export function formatSummary(s: Summary): string {
  return `${s.mean.toFixed(1)} (${s.min}–${s.max}, σ${s.stdev.toFixed(1)}, n=${s.n})`;
}

export function formatLift(l: Lift): string {
  const sign = l.abs > 0 ? "+" : "";
  const pctStr = l.pct == null ? "" : ` (${l.pct > 0 ? "+" : ""}${l.pct.toFixed(0)}%)`;
  return `${sign}${l.abs.toFixed(1)}${pctStr}`;
}
