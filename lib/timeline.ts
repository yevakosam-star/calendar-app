export type TimedBlock = {
  id: string;
  startMinutes: number;
  endMinutes: number;
};

export type BlockLayout = {
  id: string;
  column: number;
  columnCount: number;
};

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

// Greedy interval-graph column assignment: overlapping events split into
// side-by-side columns, non-overlapping clusters reuse the full width.
export function layoutTimedBlocks(blocks: TimedBlock[]): BlockLayout[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes
  );
  const results: BlockLayout[] = [];

  let cluster: TimedBlock[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const assigned: { id: string; column: number }[] = [];
    for (const block of cluster) {
      let col = columnEnds.findIndex((end) => end <= block.startMinutes);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(block.endMinutes);
      } else {
        columnEnds[col] = block.endMinutes;
      }
      assigned.push({ id: block.id, column: col });
    }
    const columnCount = columnEnds.length;
    for (const a of assigned) {
      results.push({ id: a.id, column: a.column, columnCount });
    }
    cluster = [];
  };

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMinutes >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, block.endMinutes);
  }
  flushCluster();

  return results;
}
