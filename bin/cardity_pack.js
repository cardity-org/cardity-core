const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');

const PACKAGE_SCHEMA = 'cardity.package.v1';
const DEFAULT_EXCLUDES = new Set([
  '.cardity_pkg_build',
  '.git',
  'build',
  'node_modules'
]);

function sha256(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

function normalizePackagePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function assertSafePackagePath(packagePath) {
  if (!packagePath || packagePath.startsWith('/') || packagePath.includes('\0')) {
    throw new Error(`Unsafe package path: ${packagePath}`);
  }
  const normalized = path.posix.normalize(packagePath);
  if (normalized === '..' || normalized.startsWith('../') || path.isAbsolute(normalized)) {
    throw new Error(`Unsafe package path: ${packagePath}`);
  }
  return normalized;
}

function readProjectMetadata(rootDir, options = {}) {
  const cardityJsonPath = path.join(rootDir, 'cardity.json');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const metadata = {};

  if (fs.existsSync(cardityJsonPath)) {
    Object.assign(metadata, fs.readJsonSync(cardityJsonPath));
  } else if (fs.existsSync(packageJsonPath)) {
    Object.assign(metadata, fs.readJsonSync(packageJsonPath));
  }

  return {
    name: options.name || metadata.name || path.basename(rootDir),
    version: options.version || metadata.version || '0.1.0',
    description: metadata.description || '',
    license: metadata.license || '',
    repository: typeof metadata.repository === 'string'
      ? metadata.repository
      : metadata.repository?.url || ''
  };
}

function fileKind(packagePath) {
  const name = path.basename(packagePath).toLowerCase();
  if (name.endsWith('.car')) return 'protocol_source';
  if (name.endsWith('.carc')) return 'compiled_protocol';
  if (name.endsWith('.abi.json')) return 'abi';
  if (name.endsWith('.agent.json') || name.includes('manifest')) return 'agent_manifest';
  if (packagePath.startsWith('schemas/') && name.endsWith('.json')) return 'schema';
  if (name === 'readme.md' || packagePath.startsWith('docs/')) return 'documentation';
  if (name.endsWith('.json')) return 'json';
  return 'file';
}

function mediaType(packagePath) {
  const name = path.basename(packagePath).toLowerCase();
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (name.endsWith('.car')) return 'text/plain; charset=utf-8';
  if (name.endsWith('.carc')) return 'application/octet-stream';
  return 'application/octet-stream';
}

function collectFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir).sort();
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry);
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        if (DEFAULT_EXCLUDES.has(entry)) continue;
        walk(absolutePath);
        continue;
      }
      if (!stat.isFile()) continue;
      if (entry.endsWith('.carditypkg')) continue;
      const relativePath = normalizePackagePath(path.relative(rootDir, absolutePath));
      files.push({ absolutePath, packagePath: relativePath, stat });
    }
  }

  walk(rootDir);
  return files;
}

function summarizeArtifacts(fileEntries) {
  const artifacts = {
    protocol_sources: [],
    compiled_protocols: [],
    abis: [],
    agent_manifests: [],
    schemas: [],
    documentation: []
  };

  for (const entry of fileEntries) {
    if (entry.kind === 'protocol_source') artifacts.protocol_sources.push(entry.path);
    if (entry.kind === 'compiled_protocol') artifacts.compiled_protocols.push(entry.path);
    if (entry.kind === 'abi') artifacts.abis.push(entry.path);
    if (entry.kind === 'agent_manifest') artifacts.agent_manifests.push(entry.path);
    if (entry.kind === 'schema') artifacts.schemas.push(entry.path);
    if (entry.kind === 'documentation') artifacts.documentation.push(entry.path);
  }

  return artifacts;
}

function packageFilesHash(fileEntries) {
  const canonical = fileEntries
    .map((entry) => ({ path: entry.path, sha256: entry.sha256, size: entry.size }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return sha256(JSON.stringify(canonical));
}

function packDirectory(inputDir, outputFile, options = {}) {
  const rootDir = path.resolve(inputDir);
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error(`Package input must be a directory: ${inputDir}`);
  }

  const metadata = readProjectMetadata(rootDir, options);
  const sourceFiles = collectFiles(rootDir);
  if (sourceFiles.length === 0) {
    throw new Error(`No files found to pack in ${inputDir}`);
  }

  const files = sourceFiles.map(({ absolutePath, packagePath, stat }) => {
    const body = fs.readFileSync(absolutePath);
    return {
      path: assertSafePackagePath(packagePath),
      kind: fileKind(packagePath),
      media_type: mediaType(packagePath),
      size: stat.size,
      sha256: sha256(body),
      content_b64: body.toString('base64')
    };
  });

  const packageDocument = {
    schema: PACKAGE_SCHEMA,
    package: {
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      license: metadata.license,
      repository: metadata.repository
    },
    format: {
      version: 'v1',
      encoding: 'json+base64',
      hash: 'sha256'
    },
    created_at: new Date().toISOString(),
    artifacts: summarizeArtifacts(files),
    files,
    checksums: {
      files_sha256: packageFilesHash(files)
    },
    signatures: []
  };

  validatePackageDocument(packageDocument);
  fs.ensureDirSync(path.dirname(path.resolve(outputFile)));
  fs.writeFileSync(outputFile, `${JSON.stringify(packageDocument, null, 2)}\n`, 'utf8');
  return packageDocument;
}

function validatePackageDocument(packageDocument) {
  if (!packageDocument || packageDocument.schema !== PACKAGE_SCHEMA) {
    throw new Error(`Expected ${PACKAGE_SCHEMA}`);
  }
  if (!packageDocument.package?.name || !packageDocument.package?.version) {
    throw new Error('Package metadata requires package.name and package.version');
  }
  if (!Array.isArray(packageDocument.files) || packageDocument.files.length === 0) {
    throw new Error('Package must contain at least one file');
  }

  for (const entry of packageDocument.files) {
    assertSafePackagePath(entry.path);
    if (typeof entry.content_b64 !== 'string') {
      throw new Error(`Package file is missing content_b64: ${entry.path}`);
    }
    const body = Buffer.from(entry.content_b64, 'base64');
    if (body.length !== entry.size) {
      throw new Error(`Size mismatch for ${entry.path}`);
    }
    const actualHash = sha256(body);
    if (actualHash !== entry.sha256) {
      throw new Error(`SHA-256 mismatch for ${entry.path}`);
    }
  }

  const actualFilesHash = packageFilesHash(packageDocument.files);
  if (packageDocument.checksums?.files_sha256 !== actualFilesHash) {
    throw new Error('Package files_sha256 mismatch');
  }

  return true;
}

function validatePackageFile(packageFile) {
  const packageDocument = fs.readJsonSync(path.resolve(packageFile));
  validatePackageDocument(packageDocument);
  return packageDocument;
}

function unpackPackage(packageFile, outputDir, options = {}) {
  const packageDocument = validatePackageFile(packageFile);
  const targetDir = path.resolve(outputDir);
  if (fs.existsSync(targetDir) && !options.force && fs.readdirSync(targetDir).length > 0) {
    throw new Error(`Output directory is not empty: ${outputDir}. Use --force to overwrite package files.`);
  }
  fs.ensureDirSync(targetDir);

  for (const entry of packageDocument.files) {
    const packagePath = assertSafePackagePath(entry.path);
    const absolutePath = path.join(targetDir, packagePath);
    const relativeFromTarget = path.relative(targetDir, absolutePath);
    if (relativeFromTarget.startsWith('..') || path.isAbsolute(relativeFromTarget)) {
      throw new Error(`Unsafe unpack target: ${entry.path}`);
    }
    fs.ensureDirSync(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, Buffer.from(entry.content_b64, 'base64'));
  }

  return packageDocument;
}

module.exports = {
  PACKAGE_SCHEMA,
  packDirectory,
  unpackPackage,
  validatePackageDocument,
  validatePackageFile
};
