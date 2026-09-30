import { describe, expect, it } from 'vitest';
import {
  parseProgressMessage,
  stepLabel,
  stepProgress,
} from './showcase-progress';

describe('stepProgress', () => {
  it('places each of stlite’s start-up steps along the way', () => {
    expect(stepProgress('Loading Pyodide.')).toBe(15);
    expect(stepProgress('Installing packages.')).toBe(47);
    expect(stepProgress('Booting up the Streamlit server.')).toBe(90);
  });

  it('moves forward with each step, in the order stlite reports them', () => {
    const steps = [
      'Loading Pyodide.',
      'Mounting files.',
      'Unpacking archives.',
      'Mocking some packages.',
      'Installing packages.',
      'Loading streamlit package.',
      'Setting up the loggers.',
      'Mocking some Streamlit functions for the browser environment.',
      'Booting up the Streamlit server.',
    ].map(stepProgress);
    for (const [index, percent] of steps.entries()) {
      expect(percent).toBeGreaterThan(
        index === 0 ? 0 : (steps[index - 1] ?? 0),
      );
    }
  });

  it('leaves 100% for when the app has drawn', () => {
    expect(stepProgress('Booting up the Streamlit server.')).toBeLessThan(100);
  });

  it('reads a step without its full stop or stray spaces', () => {
    expect(stepProgress(' Loading Pyodide ')).toBe(15);
  });

  it('ignores anything that isn’t a start-up step', () => {
    expect(stepProgress('Error during booting up')).toBeNull();
    expect(stepProgress('')).toBeNull();
  });
});

describe('parseProgressMessage', () => {
  it('reads how far a copy has got', () => {
    expect(parseProgressMessage({ showcase: 'progress', percent: 47 })).toBe(
      47,
    );
  });

  it('ignores other messages and bad values', () => {
    expect(parseProgressMessage({ showcase: 'ready' })).toBeNull();
    expect(parseProgressMessage({ showcase: 'progress', percent: '47' })).toBe(
      null,
    );
    expect(parseProgressMessage({ showcase: 'progress', percent: 140 })).toBe(
      null,
    );
    expect(parseProgressMessage(null)).toBeNull();
  });
});

describe('stepLabel', () => {
  it('says in plain words what’s happening at each point', () => {
    expect(stepLabel(0)).toBe('Loading Python');
    expect(stepLabel(15)).toBe('Loading Python');
    expect(stepLabel(42)).toBe('Unpacking files');
    expect(stepLabel(47)).toBe('Installing packages');
    expect(stepLabel(80)).toBe('Loading Streamlit');
    expect(stepLabel(90)).toBe('Starting Streamlit');
    expect(stepLabel(100)).toBe('Ready');
  });

  it('names every step stlite reports', () => {
    for (const step of [
      'Loading Pyodide.',
      'Mounting files.',
      'Unpacking archives.',
      'Mocking some packages.',
      'Installing packages.',
      'Loading streamlit package.',
      'Setting up the loggers.',
      'Mocking some Streamlit functions for the browser environment.',
      'Booting up the Streamlit server.',
    ]) {
      expect(stepLabel(stepProgress(step) ?? -1)).toBeTruthy();
    }
  });
});
