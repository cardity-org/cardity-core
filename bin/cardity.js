#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk').default;
const path = require('path');
const fs = require('fs-extra');

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

// 初始化项目命令
program
  .command('init [name]')
  .description('Initialize a new Cardity project')
  .action((name) => {
    const projectName = name || 'cardity-project';
    const projectPath = path.join(process.cwd(), projectName);
    
    if (fs.existsSync(projectPath)) {
      console.error(chalk.red(`❌ Error: Directory ${projectName} already exists`));
      process.exit(1);
    }
    
    try {
      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
      
      // 创建 cardity.json
      const cardityConfig = {
        name: projectName,
        version: "1.0.0",
        description: "A Cardity protocol project",
        main: "src/index.car",
        scripts: {
          build: "cardity compile src/index.car",
          run: "cardity run dist/index.carc"
        }
      };
      
      fs.writeFileSync(
        path.join(projectPath, 'cardity.json'),
        JSON.stringify(cardityConfig, null, 2)
      );
      
      // 创建示例文件
      const exampleContent = `protocol HelloWorld {
  version: "1.0.0";
  
  method greet(name: string): string {
    return "Hello, " + name + "!";
  }
  
  event Greeted(name: string, message: string);
}`;
      
      fs.writeFileSync(
        path.join(projectPath, 'src', 'index.car'),
        exampleContent
      );
      
      // 创建 README
      const readmeContent = `# ${projectName}

A Cardity protocol project.

## Usage

\`\`\`bash
# Build the protocol
npm run build

# Run the protocol
npm run run
\`\`\`

## Development

\`\`\`bash
# Compile
cardity compile src/index.car

# Generate ABI
cardity abi src/index.car

# Run
cardity run dist/index.carc
\`\`\`
`;
      
      fs.writeFileSync(
        path.join(projectPath, 'README.md'),
        readmeContent
      );
      
      console.log(chalk.green(`✅ Created Cardity project: ${projectName}`));
      console.log(chalk.blue(`📁 Project structure:`));
      console.log(chalk.gray(`   ${projectName}/`));
      console.log(chalk.gray(`   ├── cardity.json`));
      console.log(chalk.gray(`   ├── README.md`));
      console.log(chalk.gray(`   └── src/`));
      console.log(chalk.gray(`       └── index.car`));
      console.log(chalk.yellow(`\n🚀 Next steps:`));
      console.log(chalk.gray(`   cd ${projectName}`));
      console.log(chalk.gray(`   cardity compile src/index.car`));
      
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
    console.log(chalk.gray('  cardity abi src/index.car        # Generate ABI\n'));
    
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