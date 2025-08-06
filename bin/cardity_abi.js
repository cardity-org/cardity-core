#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const buildPath = path.join(__dirname, '..', 'build');
const executableName = process.platform === 'win32' ? 'cardity_abi.exe' : 'cardity_abi';
const executablePath = path.join(buildPath, executableName);

if (!fs.existsSync(executablePath)) {
  console.error(`❌ Error: cardity_abi executable not found at ${executablePath}`);
  console.error('Please run "npm run build" first to compile the C++ binaries.');
  process.exit(1);
}

const child = spawn(executablePath, process.argv.slice(2), {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('error', (error) => {
  console.error(`❌ Error executing cardity_abi: ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
}); 