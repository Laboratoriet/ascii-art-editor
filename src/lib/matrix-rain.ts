import { MATRIX_CHARS } from "./constants";

function randomChar(): string {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
}

interface Column {
  y: number;
  speed: number;
  length: number;
}

/**
 * Matrix rain: falling columns of katakana characters.
 * The source image shows through — rain is an overlay, not a replacement.
 */
export class MatrixRain {
  private columns: Column[] = [];
  private charGrid: string[][] = [];
  private cols = 0;
  private rows = 0;

  resize(cols: number, rows: number) {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;

    this.columns = [];
    for (let x = 0; x < cols; x++) {
      this.columns.push(this.newColumn());
    }

    this.charGrid = [];
    for (let x = 0; x < cols; x++) {
      const col: string[] = [];
      for (let y = 0; y < rows; y++) {
        col.push(randomChar());
      }
      this.charGrid.push(col);
    }
  }

  private newColumn(): Column {
    return {
      y: -Math.random() * 50,
      speed: 0.2 + Math.random() * 1.0,
      length: 6 + Math.floor(Math.random() * 18),
    };
  }

  tick(scale: number) {
    for (let x = 0; x < this.cols; x++) {
      const col = this.columns[x];
      col.y += col.speed * (0.3 + scale * 0.7);

      if (col.y - col.length > this.rows) {
        this.columns[x] = this.newColumn();
        this.columns[x].y = -Math.random() * 15;
      }
    }

    // Mutate ~3% of characters for the flickering effect
    const mutations = Math.max(1, Math.floor(this.cols * this.rows * 0.025));
    for (let i = 0; i < mutations; i++) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      if (this.charGrid[x]) {
        this.charGrid[x][y] = randomChar();
      }
    }
  }

  /**
   * Query rain at position (x, y).
   * Returns null if no rain trail here, or { char, rainIntensity }.
   * rainIntensity: 1.0 = head (bright white flash), 0-1 = trail fade.
   */
  getRain(x: number, y: number): { char: string; intensity: number } | null {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;

    const col = this.columns[x];
    const headY = Math.floor(col.y);
    const dist = headY - y;

    // Not in this column's trail
    if (dist < 0 || dist > col.length) return null;

    const char = this.charGrid[x]?.[y] || randomChar();

    // Head: full intensity
    if (dist <= 1) {
      return { char, intensity: 1.0 };
    }

    // Trail: fades with distance from head
    const intensity = Math.max(0, 1 - dist / col.length);
    return { char, intensity };
  }
}
