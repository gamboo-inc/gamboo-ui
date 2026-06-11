/**
 * contract-stats — contract 件数の単一ソース。
 *
 * 「コンポーネント数」として外部に見せる数字は web 実装済み（webStatus !== "pending"）で
 * 統一する。全 contract 数（app 先行 pending 含む）は内訳付き表記でのみ使う。
 * drift-check / update-showcase / showcase.spec が各自で readdirSync 直数えして
 * pending 除外の有無がずれた事故（2026-05-30 の main CI 赤）の再発防止として一本化。
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ContractStats {
  /** 全 contract 数（pending 含む） */
  all: number;
  /** web 実装済み（webStatus !== "pending"）。showcase 掲載数・「コンポーネント数」表記はこれ */
  web: number;
  /** app 先行で web 未実装（webStatus === "pending"） */
  pending: number;
}

export function getContractStats(contractDir: string): ContractStats {
  const files = readdirSync(contractDir).filter((f) => f.endsWith(".contract.json"));
  let pending = 0;
  for (const f of files) {
    const contract = JSON.parse(readFileSync(resolve(contractDir, f), "utf-8"));
    if (contract.webStatus === "pending") pending++;
  }
  return { all: files.length, pending, web: files.length - pending };
}
