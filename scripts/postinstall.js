#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default;

console.log(chalk.blue('🔧 Cardity post-install script running...'));

// 检查是否在开发环境中或全局安装
const isDev = process.env.NODE_ENV === 'development' || 
              process.env.npm_config_dev === 'true' ||
              process.argv.includes('--dev');

const isGlobal = process.env.npm_config_global === 'true' || 
                 process.argv.includes('--global') ||
                 process.env.npm_config_prefix !== undefined;

if (isDev || isGlobal) {
  console.log(chalk.yellow('⚠️  Development/Global mode detected, skipping build'));
  console.log(chalk.gray('Run "npm run build" manually to compile C++ binaries'));
  process.exit(0);
}

// 检查必要的依赖
const requiredDeps = ['cmake', 'make', 'g++'];
const missingDeps = [];

for (const dep of requiredDeps) {
  try {
    require('child_process').execSync(`which ${dep}`, { stdio: 'ignore' });
  } catch (error) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.error(chalk.red(`❌ Missing required dependencies: ${missingDeps.join(', ')}`));
  console.error(chalk.yellow('Please install the following:'));
  console.error(chalk.gray('  - cmake'));
  console.error(chalk.gray('  - make'));
  console.error(chalk.gray('  - g++ (or clang++)'));
  console.error(chalk.yellow('\nOn macOS:'));
  console.error(chalk.gray('  brew install cmake'));
  console.error(chalk.yellow('\nOn Ubuntu/Debian:'));
  console.error(chalk.gray('  sudo apt-get install cmake build-essential'));
  console.error(chalk.yellow('\nOn Windows:'));
  console.error(chalk.gray('  Install Visual Studio Build Tools or MinGW'));
  process.exit(1);
}

// 构建项目
console.log(chalk.blue('📦 Building Cardity C++ binaries...'));

const buildPath = path.join(__dirname, '..', 'build');
fs.ensureDirSync(buildPath);

try {
  // 运行 cmake
  console.log(chalk.gray('Running cmake...'));
  const cmakeResult = spawnSync('cmake', ['..'], {
    cwd: buildPath,
    stdio: 'inherit'
  });
  
  if (cmakeResult.status !== 0) {
    throw new Error('cmake failed');
  }
  
  // 运行 make
  console.log(chalk.gray('Running make...'));
  const makeResult = spawnSync('make', [], {
    cwd: buildPath,
    stdio: 'inherit'
  });
  
  if (makeResult.status !== 0) {
    throw new Error('make failed');
  }
  
  console.log(chalk.green('✅ Cardity C++ binaries built successfully!'));
  
  // 验证可执行文件
  const executables = [
    'cardityc',
    'cardity_runtime', 
    'cardity_abi',
    'cardity_deploy',
    'cardity_drc20'
  ];
  
  for (const exec of executables) {
    const execPath = path.join(buildPath, exec);
    if (fs.existsSync(execPath)) {
      console.log(chalk.gray(`  ✓ ${exec}`));
    } else {
      console.log(chalk.yellow(`  ⚠ ${exec} (not found)`));
    }
  }
  
} catch (error) {
  console.error(chalk.red(`❌ Build failed: ${error.message}`));
  console.error(chalk.yellow('You can try building manually:'));
  console.error(chalk.gray('  npm run build'));
  process.exit(1);
}

console.log(chalk.blue('\n🚀 Cardity is ready to use!'));
console.log(chalk.gray('Try: cardity --help')); 