'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'nodes', 'Postoria', 'Postoria.node.json');
const destination = path.join(root, 'dist', 'nodes', 'Postoria', 'Postoria.node.json');

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
