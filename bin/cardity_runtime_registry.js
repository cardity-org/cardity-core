const path = require('path');
const fs = require('fs-extra');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'registry', 'runtimes.json');

function loadRuntimeRegistry() {
  return fs.readJsonSync(registryPath);
}

function findRuntime(idOrName) {
  const registry = loadRuntimeRegistry();
  return registry.runtimes.find((runtime) => (
    runtime.id === idOrName
    || runtime.name === idOrName
    || runtime.compatibility_label === idOrName
  ));
}

function runtimeRegistryResult(idOrName) {
  if (!idOrName) return loadRuntimeRegistry();
  const runtime = findRuntime(idOrName);
  if (!runtime) throw new Error(`Unknown runtime: ${idOrName}`);
  return {
    schema: 'cardity.runtime_compatibility_entry.v1',
    runtime
  };
}

module.exports = {
  loadRuntimeRegistry,
  findRuntime,
  runtimeRegistryResult
};
