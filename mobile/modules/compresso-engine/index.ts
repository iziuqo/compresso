// Re-export the native module. On web, it will be resolved to CompressoEngineModule.web.ts
// and on native platforms to CompressoEngineModule.ts
export { default } from './src/CompressoEngineModule';
export * from './src/CompressoEngine.types';
