// Where new things go on a page, so a second build never lands on top of the first.

const GAP = 120;

/** Below everything already on the page. */
export function below(page: PageNode): { x: number; y: number } {
  let bottom: number | null = null;
  let left = 0;
  for (const node of page.children) {
    const end = node.y + node.height;
    if (bottom === null || end > bottom) bottom = end;
    left = Math.min(left, node.x);
  }
  return { x: bottom === null ? 0 : left, y: bottom === null ? 0 : bottom + GAP };
}

/** To the right of everything already on the page. */
export function rightOf(page: PageNode): { x: number; y: number } {
  let right: number | null = null;
  let top = 0;
  for (const node of page.children) {
    const end = node.x + node.width;
    if (right === null || end > right) right = end;
    top = Math.min(top, node.y);
  }
  return { x: right === null ? 0 : right + GAP, y: right === null ? 0 : top };
}
