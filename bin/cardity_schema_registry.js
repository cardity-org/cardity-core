const path = require('path');
const fs = require('fs-extra');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'schemas', 'registry.json');

function loadSchemaRegistry() {
  return fs.readJsonSync(registryPath);
}

function findSchemaEntry(nameOrFile) {
  const registry = loadSchemaRegistry();
  return registry.schemas.find((entry) => (
    entry.name === nameOrFile
    || entry.file === nameOrFile
    || entry.contract === nameOrFile
  ));
}

function loadSchema(nameOrFile) {
  const entry = findSchemaEntry(nameOrFile);
  if (!entry) {
    throw new Error(`Unknown schema: ${nameOrFile}`);
  }
  const schema = fs.readJsonSync(path.join(root, 'schemas', entry.file));
  return { entry, schema };
}

function schemaRegistryResult(nameOrFile) {
  if (!nameOrFile) {
    return loadSchemaRegistry();
  }
  const { entry, schema } = loadSchema(nameOrFile);
  return {
    schema: 'cardity.schema_registry_entry.v1',
    entry,
    document: schema
  };
}

module.exports = {
  loadSchemaRegistry,
  findSchemaEntry,
  loadSchema,
  schemaRegistryResult
};
