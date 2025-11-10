#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const drawingsDir = path.join(projectRoot, 'drawings');
const groupDirs = ['core', 'community', 'shared'];
let running = false;
let needsRun = false;
let lastSignature = null;

function runBuild() {
  if (running) {
    needsRun = true;
    return;
  }
  running = true;
  const proc = spawn('npm', ['run', 'build:drawings'], {
    stdio: 'inherit',
    cwd: projectRoot
  });
  proc.on('exit', (code) => {
    running = false;
    if (needsRun) {
      needsRun = false;
      runBuild();
      return;
    }
    if (code !== 0) {
      console.error('build:drawings failed');
    }
  });
}

async function listDrawingFiles() {
  const files = [];
  const rootEntries = await fs.readdir(drawingsDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'manifest.json') {
      files.push(path.join(drawingsDir, entry.name));
    }
  }
  for (const group of groupDirs) {
    const dirPath = path.join(drawingsDir, group);
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(path.join(dirPath, entry.name));
        }
      }
    } catch {
      // directory missing, skip
    }
  }
  files.sort();
  return files;
}

async function computeSignature() {
  const files = await listDrawingFiles();
  const hash = createHash('sha1');
  for (const file of files) {
    const stats = await fs.stat(file);
    hash.update(file);
    hash.update(String(stats.mtimeMs));
  }
  return hash.digest('hex');
}

async function monitorLoop() {
  try {
    const signature = await computeSignature();
    if (signature !== lastSignature) {
      lastSignature = signature;
      runBuild();
    }
  } catch (error) {
    console.error('Manifest watcher error:', error.message);
  }
}

async function start() {
  console.log('👀 Polling drawings/ for manifest rebuilds...');
  try {
    lastSignature = await computeSignature();
  } catch {
    lastSignature = null;
  }
  runBuild();
  setInterval(monitorLoop, 1500);
}

start();
