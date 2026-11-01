import { registerWebModule, NativeModule } from 'expo';

// The web build uses src/engine/host.web.ts (canvas) instead of this module.
class CompressoEngineModule extends NativeModule<{}> {}

export default registerWebModule(CompressoEngineModule, 'CompressoEngineModule');
