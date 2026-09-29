interface ViewportBounds {
  ne: [number, number];
  sw: [number, number];
}

interface BoundedItem {
  bounds: ViewportBounds;
  [key: string]: unknown;
}

class SpatialNode {
  items: BoundedItem[];
  children: SpatialNode[];
  bounds: ViewportBounds;
  depth: number;
  capacity: number;

  constructor(
    items: BoundedItem[] = [],
    depth = 0,
    capacity = 16,
  ) {
    this.items = items;
    this.children = [];
    this.depth = depth;
    this.capacity = capacity;

    if (items.length > 0) {
      this.bounds = {
        ne: [
          Math.max(...items.map((i) => i.bounds.ne[0])),
          Math.max(...items.map((i) => i.bounds.ne[1])),
        ],
        sw: [
          Math.min(...items.map((i) => i.bounds.sw[0])),
          Math.min(...items.map((i) => i.bounds.sw[1])),
        ],
      };
    } else {
      this.bounds = { ne: [0, 0], sw: [0, 0] };
    }
  }

  get isLeaf(): boolean {
    return this.children.length === 0;
  }
}

export class SpatialIndex {
  private root: SpatialNode | null = null;
  private capacity: number;

  constructor(capacity = 16) {
    this.capacity = capacity;
  }

  insert(item: BoundedItem): void {
    this.root = this.insertInto(this.root, item, 0);
  }

  query(bounds: ViewportBounds): BoundedItem[] {
    const results: BoundedItem[] = [];
    this.queryNode(this.root, bounds, results);
    return results;
  }

  private insertInto(node: SpatialNode | null, item: BoundedItem, depth: number): SpatialNode {
    if (!node) {
      return new SpatialNode([item], depth, this.capacity);
    }

    if (!node.isLeaf || node.items.length < this.capacity) {
      node.items.push(item);
      return node;
    }

    if (depth >= 5) {
      node.items.push(item);
      return node;
    }

    const children = this.subdivide(node);
    for (const child of children) {
      this.insertInto(child, item, depth + 1);
    }

    return new SpatialNode(children as unknown as BoundedItem[], depth, this.capacity);
  }

  private queryNode(node: SpatialNode | null, queryBounds: ViewportBounds, results: BoundedItem[]): void {
    if (!node) return;

    if (node.isLeaf) {
      for (const item of node.items) {
        if (this.intersects(item.bounds, queryBounds)) {
          results.push(item);
        }
      }
      return;
    }

    for (const child of node.children) {
      this.queryNode(child, queryBounds, results);
    }
  }

  private intersects(a: ViewportBounds, b: ViewportBounds): boolean {
    return (
      a.ne[0] >= b.sw[0] &&
      a.sw[0] <= b.ne[0] &&
      a.ne[1] >= b.sw[1] &&
      a.sw[1] <= b.ne[1]
    );
  }

  private subdivide(node: SpatialNode): SpatialNode[] {
    const children: SpatialNode[] = [];
    const midX = (node.bounds.ne[0] + node.bounds.sw[0]) / 2;
    const midY = (node.bounds.ne[1] + node.bounds.sw[1]) / 2;

    for (const item of node.items) {
      let quadrant = 0;
      if (item.bounds.ne[0] > midX) quadrant |= 1;
      if (item.bounds.ne[1] > midY) quadrant |= 2;
      if (!children[quadrant]) {
        children[quadrant] = new SpatialNode([], node.depth + 1, this.capacity);
      }
      children[quadrant].items.push(item);
    }

    return children;
  }
}
