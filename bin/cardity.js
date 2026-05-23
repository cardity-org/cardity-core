#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk').default;
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { spawnSync } = require('child_process');
const { reviewManifest, renderReviewMarkdown } = require('./cardity_review');
const { diffManifest, renderDiffMarkdown } = require('./cardity_diff');
const { summarizeManifest, renderExplainMarkdown } = require('./cardity_explain');
const { runConformance, renderConformanceMarkdown } = require('./cardity_conformance');
const { buildVisualization, renderMermaid, renderVisualizationMarkdown, renderVisualizationHtml } = require('./cardity_visualize');
const { validateRuntimeAdapter, renderRuntimeAdapterMarkdown } = require('./cardity_adapter');
const { schemaRegistryResult } = require('./cardity_schema_registry');
const { runtimeRegistryResult } = require('./cardity_runtime_registry');
const { packDirectory, unpackPackage, validatePackageFile } = require('./cardity_pack');
const { registryResult, COLLECTIONS } = require('./cardity_registry');

function templatesPath() {
  return path.join(__dirname, '..', 'templates');
}

function listTemplates() {
  const root = templatesPath();
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isDirectory())
    .map((name) => {
      const metadataPath = path.join(root, name, 'cardity.template.json');
      const metadata = fs.existsSync(metadataPath)
        ? fs.readJsonSync(metadataPath)
        : { name, title: name, description: '' };
      return { ...metadata, dir: path.join(root, name) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function findTemplate(name) {
  return listTemplates().find((template) => template.name === name);
}

function writeTemplateProject(projectPath, template) {
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });

  const entry = template.entry || 'protocol.car';
  const sourcePath = path.join(template.dir, entry);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Template ${template.name} is missing ${entry}`);
  }

  fs.copyFileSync(sourcePath, path.join(projectPath, 'src', 'protocol.car'));
  const readmePath = path.join(template.dir, 'README.md');
  if (fs.existsSync(readmePath)) {
    fs.copyFileSync(readmePath, path.join(projectPath, 'README.md'));
  }

  const cardityConfig = {
    name: path.basename(projectPath),
    version: "1.0.0",
    description: template.description || "A Cardity protocol project",
    template: template.name,
    main: "src/protocol.car",
    scripts: {
      compile: "cardity_agent compile src/protocol.car --out-dir dist --include-manifest --include-protocol --include-abi",
      manifest: "cardity manifest src/protocol.car -o dist/protocol.agent.json"
    }
  };

  fs.writeFileSync(
    path.join(projectPath, 'cardity.json'),
    JSON.stringify(cardityConfig, null, 2)
  );
}

function loadManifestFromFile(inputFile) {
  const inputPath = path.resolve(inputFile);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  if (path.extname(inputPath).toLowerCase() === '.json') {
    const payload = fs.readJsonSync(inputPath);
    return payload.manifest || payload;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cardity-explain-'));
  const manifestPath = path.join(tempDir, `${path.basename(inputPath, path.extname(inputPath))}.agent.json`);
  const executable = checkExecutable('cardityc');
  const result = spawnSync(executable, [inputPath, '--format', 'agent-manifest', '-o', manifestPath], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `cardityc failed with exit code ${result.status}`).trim());
  }

  const manifest = fs.readJsonSync(manifestPath);
  fs.removeSync(tempDir);
  return manifest;
}

// 获取可执行文件路径
function getExecutablePath(name) {
  const platform = process.platform;
  const arch = process.arch;
  
  // 构建路径
  const buildPath = path.join(__dirname, '..', 'build');
  const executableName = platform === 'win32' ? `${name}.exe` : name;
  const executablePath = path.join(buildPath, executableName);
  
  return executablePath;
}

// 检查可执行文件是否存在
function checkExecutable(name) {
  const execPath = getExecutablePath(name);
  if (!fs.existsSync(execPath)) {
    console.error(chalk.red(`❌ Error: ${name} executable not found at ${execPath}`));
    console.error(chalk.yellow('Please run "npm run build" first to compile the C++ binaries.'));
    process.exit(1);
  }
  return execPath;
}

// 执行命令
function executeCommand(name, args) {
  const execPath = checkExecutable(name);
  const { spawn } = require('child_process');
  
  const child = spawn(execPath, args, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  child.on('error', (error) => {
    console.error(chalk.red(`❌ Error executing ${name}: ${error.message}`));
    process.exit(1);
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
}

program
  .name('cardity')
  .description('Cardity - A modern programming language for blockchain protocol development on Dogecoin')
  .version('1.0.0');

// 编译器命令
program
  .command('compile <file>')
  .description('Compile a .car file to .carc binary format')
  .option('-o, --output <file>', 'Output file path')
  .option('--format <format>', 'Output format (car, carc)', 'carc')
  .action((file, options) => {
    const args = [file];
    if (options.output) args.push('-o', options.output);
    if (options.format) args.push('--format', options.format);
    executeCommand('cardityc', args);
  });

// 运行时命令
program
  .command('run <file>')
  .description('Run a compiled .carc file')
  .option('-a, --args <args>', 'Arguments to pass to the protocol')
  .action((file, options) => {
    const args = [file];
    if (options.args) args.push('--args', options.args);
    executeCommand('cardity_runtime', args);
  });

// ABI 生成命令
program
  .command('abi <file>')
  .description('Generate ABI from a .car file')
  .option('-o, --output <file>', 'Output file path')
  .action((file, options) => {
    const args = [file];
    if (options.output) args.push('-o', options.output);
    executeCommand('cardity_abi', args);
  });

// Agent OS manifest command
program
  .command('manifest <file>')
  .description('Generate an Agent OS manifest from a .car protocol')
  .option('-o, --output <file>', 'Output file path')
  .action((file, options) => {
    const args = [file, '--format', 'agent-manifest'];
    if (options.output) args.push('-o', options.output);
    executeCommand('cardityc', args);
  });

program
  .command('explain <file>')
  .description('Explain a .car protocol or Agent OS manifest as Markdown')
  .option('--json', 'Output machine-readable summary JSON')
  .option('--diagram', 'Include a Mermaid contract graph in Markdown output')
  .option('-o, --output <file>', 'Write explanation to a file')
  .action((file, options) => {
    try {
      const manifest = loadManifestFromFile(file);
      const summary = summarizeManifest(manifest);
      const output = options.json
        ? `${JSON.stringify(summary, null, 2)}\n`
        : renderExplainMarkdown(summary, { diagram: options.diagram });

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error explaining ${file}: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('review <file>')
  .description('Review a .car protocol or Agent OS manifest for action/projection safety')
  .option('--json', 'Output machine-readable security review JSON')
  .option('-o, --output <file>', 'Write review to a file')
  .action((file, options) => {
    try {
      const manifest = loadManifestFromFile(file);
      const review = reviewManifest(manifest);
      const output = options.json
        ? `${JSON.stringify(review, null, 2)}\n`
        : renderReviewMarkdown(review);

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error reviewing ${file}: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('diff <oldFile> <newFile>')
  .description('Compare two .car protocols or Agent OS manifests for contract changes')
  .option('--json', 'Output machine-readable diff JSON')
  .option('-o, --output <file>', 'Write diff to a file')
  .action((oldFile, newFile, options) => {
    try {
      const oldManifest = loadManifestFromFile(oldFile);
      const newManifest = loadManifestFromFile(newFile);
      const diff = diffManifest(oldManifest, newManifest);
      const output = options.json
        ? `${JSON.stringify(diff, null, 2)}\n`
        : renderDiffMarkdown(diff);

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error diffing protocols: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('conformance <file>')
  .description('Run Cardity conformance checks for a .car protocol or Agent OS manifest')
  .option('--runtime-adapter <file>', 'Optional runtime adapter declaration JSON')
  .option('--json', 'Output machine-readable conformance report JSON')
  .option('-o, --output <file>', 'Write report to a file')
  .action((file, options) => {
    try {
      const manifest = loadManifestFromFile(file);
      const runtimeAdapter = options.runtimeAdapter ? fs.readJsonSync(path.resolve(options.runtimeAdapter)) : null;
      const report = runConformance(manifest, { runtimeAdapter });
      const output = options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : renderConformanceMarkdown(report);

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error running conformance: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('adapter <file>')
  .description('Validate a Cardity runtime adapter declaration')
  .option('--json', 'Output machine-readable adapter validation JSON')
  .option('-o, --output <file>', 'Write validation report to a file')
  .action((file, options) => {
    try {
      const adapter = fs.readJsonSync(path.resolve(file));
      const report = validateRuntimeAdapter(adapter);
      const output = options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : renderRuntimeAdapterMarkdown(report);

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error validating runtime adapter: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('schemas [name]')
  .description('Show the Cardity schema registry or a schema document')
  .option('--json', 'Output machine-readable JSON', true)
  .option('-o, --output <file>', 'Write schema registry output to a file')
  .action((name, options) => {
    try {
      const payload = schemaRegistryResult(name);
      const output = `${JSON.stringify(payload, null, 2)}\n`;

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error reading schema registry: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('runtimes [id]')
  .description('Show Cardity-compatible runtime registry entries')
  .option('--json', 'Output machine-readable JSON', true)
  .option('-o, --output <file>', 'Write runtime registry output to a file')
  .action((id, options) => {
    try {
      const payload = runtimeRegistryResult(id);
      const output = `${JSON.stringify(payload, null, 2)}\n`;

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error reading runtime registry: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('registry [collection] [id]')
  .description('Show the Cardity ecosystem registry or one collection/entry')
  .option('--json', 'Output machine-readable JSON', true)
  .option('-o, --output <file>', 'Write registry output to a file')
  .action((collection, id, options) => {
    try {
      if (collection && !COLLECTIONS.includes(collection)) {
        console.error(chalk.yellow(`Known collections: ${COLLECTIONS.join(', ')}`));
      }
      const payload = registryResult(collection, id);
      const output = `${JSON.stringify(payload, null, 2)}\n`;

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error reading ecosystem registry: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('pack <dir>')
  .description('Create a portable .carditypkg from a protocol project or dist directory')
  .option('-o, --output <file>', 'Output .carditypkg file')
  .option('--name <name>', 'Override package name')
  .option('--pkg-version <version>', 'Override package version')
  .action((dir, options) => {
    try {
      const inputDir = path.resolve(dir);
      const packageName = options.name || path.basename(inputDir);
      const outputFile = options.output
        ? path.resolve(options.output)
        : path.resolve(process.cwd(), `${packageName}.carditypkg`);
      const packageDocument = packDirectory(inputDir, outputFile, {
        name: options.name,
        version: options.pkgVersion
      });
      console.log(chalk.green(`✅ Created Cardity package: ${outputFile}`));
      console.log(chalk.gray(`   ${packageDocument.package.name}@${packageDocument.package.version}`));
      console.log(chalk.gray(`   files: ${packageDocument.files.length}`));
      console.log(chalk.gray(`   sha256: ${packageDocument.checksums.files_sha256}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error packing Cardity package: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('unpack <file>')
  .description('Unpack and verify a .carditypkg into a directory')
  .requiredOption('--out-dir <dir>', 'Output directory')
  .option('--force', 'Allow writing into a non-empty output directory')
  .action((file, options) => {
    try {
      const packageDocument = unpackPackage(file, options.outDir, { force: options.force });
      console.log(chalk.green(`✅ Unpacked Cardity package: ${path.resolve(options.outDir)}`));
      console.log(chalk.gray(`   ${packageDocument.package.name}@${packageDocument.package.version}`));
      console.log(chalk.gray(`   files: ${packageDocument.files.length}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error unpacking Cardity package: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('verify-package <file>')
  .description('Verify .carditypkg metadata, file hashes, and package checksum')
  .option('--json', 'Output machine-readable package metadata JSON')
  .action((file, options) => {
    try {
      const packageDocument = validatePackageFile(file);
      if (options.json) {
        console.log(JSON.stringify({
          schema: 'cardity.package_verification.v1',
          ok: true,
          package: packageDocument.package,
          files: packageDocument.files.map((entry) => ({
            path: entry.path,
            kind: entry.kind,
            size: entry.size,
            sha256: entry.sha256
          })),
          checksums: packageDocument.checksums
        }, null, 2));
        return;
      }
      console.log(chalk.green(`✅ Cardity package verified: ${path.resolve(file)}`));
      console.log(chalk.gray(`   ${packageDocument.package.name}@${packageDocument.package.version}`));
      console.log(chalk.gray(`   files: ${packageDocument.files.length}`));
      console.log(chalk.gray(`   sha256: ${packageDocument.checksums.files_sha256}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error verifying Cardity package: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('visualize <file>')
  .description('Visualize a .car protocol or Agent OS manifest as a layered contract graph')
  .option('--json', 'Output machine-readable visualization JSON')
  .option('--mermaid', 'Output only the Mermaid graph')
  .option('--html', 'Output a self-contained HTML visualization report')
  .option('-o, --output <file>', 'Write visualization to a file')
  .action((file, options) => {
    try {
      const manifest = loadManifestFromFile(file);
      const visualization = buildVisualization(manifest);
      const output = options.json
        ? `${JSON.stringify(visualization, null, 2)}\n`
        : options.mermaid
          ? `${renderMermaid(visualization)}\n`
          : options.html
            ? renderVisualizationHtml(visualization)
            : renderVisualizationMarkdown(visualization);

      if (options.output) {
        fs.ensureDirSync(path.dirname(path.resolve(options.output)));
        fs.writeFileSync(options.output, output, 'utf8');
      } else {
        process.stdout.write(output);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error visualizing ${file}: ${error.message}`));
      process.exit(1);
    }
  });

// 部署命令
program
  .command('deploy <file>')
  .description('Deploy a .carc file to Dogecoin blockchain')
  .option('-n, --network <network>', 'Network (mainnet, testnet)', 'mainnet')
  .option('-r, --rpc <url>', 'RPC endpoint URL')
  .action((file, options) => {
    const args = ['deploy', file];
    if (options.network) args.push('--network', options.network);
    if (options.rpc) args.push('--rpc', options.rpc);
    executeCommand('cardity_deploy', args);
  });

// DRC-20 命令
program
  .command('drc20')
  .description('DRC-20 token operations')
  .addCommand(
    program
      .createCommand('compile <file>')
      .description('Compile a DRC-20 token definition')
      .action((file) => {
        executeCommand('cardity_drc20', ['compile', file]);
      })
  )
  .addCommand(
    program
      .createCommand('deploy <file>')
      .description('Deploy a DRC-20 token')
      .option('-n, --network <network>', 'Network (mainnet, testnet)', 'mainnet')
      .action((file, options) => {
        const args = ['deploy', file];
        if (options.network) args.push('--network', options.network);
        executeCommand('cardity_drc20', args);
      })
  )
  .addCommand(
    program
      .createCommand('mint <tick> <amount>')
      .description('Mint DRC-20 tokens')
      .option('-n, --network <network>', 'Network (mainnet, testnet)', 'mainnet')
      .action((tick, amount, options) => {
        const args = ['mint', tick, amount];
        if (options.network) args.push('--network', options.network);
        executeCommand('cardity_drc20', args);
      })
  )
  .addCommand(
    program
      .createCommand('transfer <tick> <to> <amount>')
      .description('Transfer DRC-20 tokens')
      .option('-n, --network <network>', 'Network (mainnet, testnet)', 'mainnet')
      .action((tick, to, amount, options) => {
        const args = ['transfer', tick, to, amount];
        if (options.network) args.push('--network', options.network);
        executeCommand('cardity_drc20', args);
      })
  );

// Cardity invoke inscription generator
program
  .command('invoke <contract> <method>')
  .description('Generate a Cardity invoke inscription JSON (p=cardity, op=invoke)')
  .option('-a, --args <json>', 'JSON array of args, e.g. "[\"addr\", 100]"', '[]')
  .option('-m, --module <name>', 'Optional module name, or use dot in method (Module.method)')
  .action((contract, method, options) => {
    try {
      const args = JSON.parse(options.args || '[]');
      const payload = {
        p: 'cardity',
        op: 'invoke',
        contract_id: contract,
        method,
        args,
      };
      if (options.module) payload.module = options.module;
      console.log(JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('❌ Invalid JSON for --args');
      process.exit(1);
    }
  });

// Encode invoke payload to hex (for raw OP_RETURN usage)
program
  .command('encode-invoke <method>')
  .description('Encode {method,args} into UTF-8 hex for OP_RETURN (ABI not required)')
  .option('-a, --args <json>', 'JSON array of args, e.g. "[\"addr\", 100]"', '[]')
  .action((method, options) => {
    try {
      const args = JSON.parse(options.args || '[]');
      const payload = JSON.stringify({ method, args });
      const hex = Buffer.from(payload, 'utf8').toString('hex');
      console.log(hex);
    } catch (e) {
      console.error('❌ Invalid JSON for --args');
      process.exit(1);
    }
  });

// Convert .carc binary to hex for raw on-chain storage
program
  .command('ophex <carcFile>')
  .description('Output hex of a compiled .carc file (for OP_RETURN/inscription)')
  .action((carcFile) => {
    try {
      const data = fs.readFileSync(carcFile);
      const hex = Buffer.from(data).toString('hex');
      console.log(hex);
    } catch (e) {
      console.error(chalk.red(`❌ Failed to read ${carcFile}: ${e.message}`));
      process.exit(1);
    }
  });

// 初始化项目命令
program
  .command('init [name]')
  .description('Initialize a new Cardity project')
  .option('-t, --template <name>', 'Template name')
  .option('--list-templates', 'List available templates')
  .action((name, options) => {
    if (options.listTemplates) {
      const templates = listTemplates();
      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found.'));
        return;
      }
      console.log(chalk.blue.bold('Available Cardity templates:\n'));
      for (const template of templates) {
        console.log(chalk.green(`  ${template.name}`));
        if (template.description) console.log(chalk.gray(`    ${template.description}`));
      }
      return;
    }

    const projectName = name || 'cardity-project';
    const projectPath = path.resolve(process.cwd(), projectName);
    
    if (fs.existsSync(projectPath)) {
      console.error(chalk.red(`❌ Error: Directory ${projectName} already exists`));
      process.exit(1);
    }
    
    try {
      const templateName = options.template || 'member_points';
      const template = findTemplate(templateName);
      if (!template) {
        console.error(chalk.red(`❌ Unknown template: ${templateName}`));
        console.error(chalk.yellow('Run "cardity init --list-templates" to see available templates.'));
        process.exit(1);
      }

      writeTemplateProject(projectPath, template);

      if (!fs.existsSync(path.join(projectPath, 'README.md'))) {
        const readmeContent = `# ${projectName}

A Cardity protocol project.

## Usage

\`\`\`bash
cardity_agent compile src/protocol.car \\
  --out-dir dist \\
  --include-manifest \\
  --include-protocol \\
  --include-abi
\`\`\`

## Development

\`\`\`bash
cardity manifest src/protocol.car -o dist/protocol.agent.json
\`\`\`
`;
        fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);
      }
      
      console.log(chalk.green(`✅ Created Cardity project: ${path.basename(projectPath)}`));
      console.log(chalk.blue(`📦 Template: ${template.name}`));
      console.log(chalk.blue(`📁 Project structure:`));
      console.log(chalk.gray(`   ${path.basename(projectPath)}/`));
      console.log(chalk.gray(`   ├── cardity.json`));
      console.log(chalk.gray(`   ├── README.md`));
      console.log(chalk.gray(`   └── src/`));
      console.log(chalk.gray(`       └── protocol.car`));
      console.log(chalk.yellow(`\n🚀 Next steps:`));
      console.log(chalk.gray(`   cd ${projectName}`));
      console.log(chalk.gray(`   cardity_agent compile src/protocol.car --out-dir dist --include-manifest`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error creating project: ${error.message}`));
      process.exit(1);
    }
  });

// 显示帮助信息
program
  .command('help')
  .description('Show detailed help information')
  .action(() => {
    console.log(chalk.blue.bold('Cardity - Blockchain Protocol Development Language'));
    console.log(chalk.gray('A modern programming language for Dogecoin blockchain protocols\n'));
    
    console.log(chalk.yellow.bold('Quick Start:'));
    console.log(chalk.gray('  cardity init my-project          # Create new project'));
    console.log(chalk.gray('  cardity compile src/index.car    # Compile protocol'));
    console.log(chalk.gray('  cardity run dist/index.carc      # Run protocol'));
    console.log(chalk.gray('  cardity abi src/index.car        # Generate ABI'));
    console.log(chalk.gray('  cardity manifest src/index.car   # Generate Agent OS manifest\n'));
    console.log(chalk.gray('  cardity explain src/index.car    # Explain manifest/action/database contract\n'));
    console.log(chalk.gray('  cardity review src/index.car     # Review action/projection safety\n'));
    console.log(chalk.gray('  cardity diff old.car new.car     # Compare protocol contract changes\n'));
    console.log(chalk.gray('  cardity conformance src/index.car # Run Cardity compatibility checks\n'));
    console.log(chalk.gray('  cardity adapter runtime.json      # Validate runtime adapter compatibility\n'));
    console.log(chalk.gray('  cardity schemas                   # Show schema registry\n'));
    console.log(chalk.gray('  cardity runtimes                  # Show compatible runtime registry\n'));
    console.log(chalk.gray('  cardity registry templates        # Show ecosystem registry templates\n'));
    console.log(chalk.gray('  cardity pack dist                 # Create a portable .carditypkg\n'));
    console.log(chalk.gray('  cardity unpack app.carditypkg --out-dir out # Verify and unpack a package\n'));
    console.log(chalk.gray('  cardity visualize src/index.car  # Render a layered manifest graph\n'));
    
    console.log(chalk.yellow.bold('DRC-20 Token Operations:'));
    console.log(chalk.gray('  cardity drc20 compile token.car  # Compile token'));
    console.log(chalk.gray('  cardity drc20 deploy token.car   # Deploy token'));
    console.log(chalk.gray('  cardity drc20 mint DOGE 1000     # Mint tokens'));
    console.log(chalk.gray('  cardity drc20 transfer DOGE addr 100 # Transfer tokens\n'));
    
    console.log(chalk.yellow.bold('Deployment:'));
    console.log(chalk.gray('  cardity deploy dist/index.carc   # Deploy to Dogecoin\n'));
    
    console.log(chalk.blue('For more information, visit: https://github.com/cardity-org/cardity-core'));
  });

program.parse(); 
