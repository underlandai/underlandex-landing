export interface StrataOptions {
  time?: number;
  still?: boolean;
  onReady?: () => void;
  onLost?: () => void;
}
export interface StrataHandle {
  isRunning(): boolean;
  snapshot(w: number, h: number, ratio?: number): string;
  destroy(): void;
}
export function mount(host: HTMLElement, opts?: StrataOptions): StrataHandle;
