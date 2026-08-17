import { createDefaultEsmPreset } from 'ts-jest';

const presetConfig = createDefaultEsmPreset({ tsconfig: 'tsconfig.test.json' });

/** @type {import("jest").Config} **/
export default {
  ...presetConfig,
  testEnvironment: 'node',
  // src imports with explicit .js extensions (nodenext); map them back to the .ts sources
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  verbose: true,
  collectCoverage: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!tests/**', '!node_modules/**'],
};
