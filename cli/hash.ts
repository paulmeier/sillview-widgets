/** SHA-256 helpers shared by the gate and the index builder. */

import { createHash } from 'node:crypto';

/** Hex SHA-256 of a file's bytes. */
export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * The aggregate content hash over a set of already-hashed files. Identical formula
 * to kasas-plugins' `hashTree`: SHA-256 of `"<path>\x00<filehash>\n"` lines in path
 * order, so it is independent of filesystem ordering and changes if any file's name
 * or content changes. The sillview installer recomputes this to verify a download as
 * a whole.
 */
export function aggregateHash(files: { path: string; sha256: string }[]): string {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const agg = createHash('sha256');
  for (const f of sorted) agg.update(`${f.path}\x00${f.sha256}\n`);
  return 'sha256:' + agg.digest('hex');
}
