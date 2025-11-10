#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const drawingsDir = path.join(projectRoot, 'drawings');
const outputPath = path.join(drawingsDir, 'manifest.json');
const GROUPS = ['core', 'community'];

async function safeStat(filePath) {
    try {
        return await fs.stat(filePath);
    } catch {
        return null;
    }
}

async function collectDrawings() {
    const drawings = [];
    for (const group of GROUPS) {
        const groupDir = path.join(drawingsDir, group);
        const stats = await safeStat(groupDir);
        if (!stats?.isDirectory()) {
            continue;
        }
        const entries = await fs.readdir(groupDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            if (!entry.name.endsWith('.js')) continue;
            if (entry.name === 'index.js') continue;
            const absolutePath = path.join(groupDir, entry.name);
            const fileStat = await fs.stat(absolutePath);
            const content = await fs.readFile(absolutePath);
            const hash = createHash('sha1').update(content).digest('hex');
            drawings.push({
                group,
                path: `/drawings/${group}/${entry.name}`,
                hash,
                mtime: fileStat.mtimeMs
            });
        }
    }
    drawings.sort((a, b) => a.path.localeCompare(b.path));
    return drawings;
}

async function buildManifest() {
    const drawings = await collectDrawings();
    const versionHash = createHash('sha1')
        .update(drawings.map(d => d.hash).join('|'))
        .digest('hex')
        .slice(0, 12);
    return {
        version: versionHash || 'dev',
        drawings: drawings.map(({ hash, mtime, ...rest }) => rest)
    };
}

async function writeManifest(manifest) {
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

async function readExistingManifest() {
    try {
        const contents = await fs.readFile(outputPath, 'utf-8');
        return JSON.parse(contents);
    } catch {
        return null;
    }
}

async function main() {
    try {
        const manifest = await buildManifest();
        const existing = await readExistingManifest();
        if (
            existing &&
            existing.version === manifest.version &&
            JSON.stringify(existing.drawings) === JSON.stringify(manifest.drawings)
        ) {
            console.log('Drawings manifest already up to date');
            return;
        }
        manifest.generatedAt = new Date().toISOString();
        await writeManifest(manifest);
        console.log(`Generated drawings manifest at ${path.relative(projectRoot, outputPath)}`);
    } catch (error) {
        console.error('Failed to build drawings manifest:', error);
        process.exitCode = 1;
    }
}

main();
