export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dots {
  homeX: Float32Array;
  homeY: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}

export const idleBeforeWander = 0;

export const sampleDots: (options: {
  box: Box;
  spacing: number;
  isInside: (x: number, y: number) => boolean;
}) => Dots = () => {
  const empty = new Float32Array(0);
  return {
    homeX: empty,
    homeY: empty,
    x: empty,
    y: empty,
    vx: empty,
    vy: empty,
  };
};

export const stepDots: (
  dots: Dots,
  elapsed: number,
  pusher: Point | null,
  pushRadius: number,
) => boolean = () => false;

export const pushRadiusFor: (markHeight: number) => number = () => 0;

export const wanderPoint: (time: number, mark: Box) => Point = () => ({
  x: 0,
  y: 0,
});

export const choosePusher: (state: {
  pointer: Point | null;
  idleFor: number;
  canWander: boolean;
  time: number;
  mark: Box;
}) => Point | null = () => null;

export const canvasScale: (devicePixelRatio: number) => number = () => 0;
