export interface RampStop {
  at: number;
  color: string;
}

export const mixColors: (
  from: string,
  to: string,
  amount: number,
) => string = () => '';

export const rampColor: (ramp: RampStop[], at: number) => string = () => '';

export const wheelColor: (colors: string[], turn: number) => string = () => '';
