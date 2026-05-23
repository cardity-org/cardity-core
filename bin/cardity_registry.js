const path = require('path');
const fs = require('fs-extra');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'registry', 'catalog.json');

const COLLECTIONS = [
  'templates',
  'schemas',
  'runtime_adapters',
  'runtimes',
  'badges',
  'packages'
];

function loadRegistryCatalog() {
  return fs.readJsonSync(catalogPath);
}

function itemMatches(item, idOrName) {
  return item.id === idOrName
    || item.name === idOrName
    || item.title === idOrName
    || item.contract === idOrName;
}

function registryResult(collection, idOrName) {
  const catalog = loadRegistryCatalog();
  if (!collection) return catalog;

  if (!COLLECTIONS.includes(collection)) {
    throw new Error(`Unknown registry collection: ${collection}`);
  }

  const items = catalog[collection] || [];
  if (!idOrName) {
    return {
      schema: 'cardity.ecosystem_registry_collection.v1',
      collection,
      count: items.length,
      items
    };
  }

  const item = items.find((entry) => itemMatches(entry, idOrName));
  if (!item) {
    throw new Error(`Unknown ${collection} registry entry: ${idOrName}`);
  }

  return {
    schema: 'cardity.ecosystem_registry_entry.v1',
    collection,
    item
  };
}

module.exports = {
  COLLECTIONS,
  loadRegistryCatalog,
  registryResult
};
