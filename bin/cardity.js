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
const { buildVisualization, renderMermaid, renderVisualizationMarkdown } = require('./cardity_visualize');

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
  .command('visualize <file>')
  .description('Visualize a .car protocol or Agent OS manifest as a layered contract graph')
  .option('--json', 'Output machine-readable visualization JSON')
  .option('--mermaid', 'Output only the Mermaid graph')
  .option('-o, --output <file>', 'Write visualization to a file')
  .action((file, options) => {
    try {
      const manifest = loadManifestFromFile(file);
      const visualization = buildVisualization(manifest);
      const output = options.json
        ? `${JSON.stringify(visualization, null, 2)}\n`
        : options.mermaid
          ? `${renderMermaid(visualization)}\n`
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
