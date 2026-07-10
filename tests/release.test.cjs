'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const { toUtcIso } = require('../dist/nodes/Postoria/shared/dateTime.js');
const constants = require('../dist/nodes/Postoria/shared/constants.js');

test('package metadata is suitable for an n8n community node', () => {
	assert.equal(packageJson.name, '@postoria/n8n-nodes-postoria');
	assert.match(packageJson.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
	assert.ok(packageJson.keywords.includes('n8n-community-node-package'));
	assert.deepEqual(packageJson.dependencies, undefined);
	assert.equal(packageJson.n8n.strict, true);
	assert.deepEqual(packageJson.n8n.nodes, ['dist/nodes/Postoria/Postoria.node.js']);
	assert.deepEqual(packageJson.n8n.credentials, ['dist/credentials/PostoriaApi.credentials.js']);
	assert.equal(packageJson.publishConfig.provenance, true);
	assert.equal(packageJson.author.email, 'contact@postoria.io');
	assert.equal(packageJson.files.includes('VALIDATION.md'), false);
});

test('credential uses Bearer authentication and the agreed settings URL', () => {
	const source = read('credentials/PostoriaApi.credentials.ts');
	assert.match(source, /Authorization:\s*'=Bearer \{\{\$credentials\.apiKey\}\}'/);
	assert.match(source, /https:\/\/app\.postoria\.io\/settings/);
	assert.match(source, /\/v1\/workspaces/);
});

test('all agreed resources and operations are present', () => {
	const main = read('nodes/Postoria/Postoria.node.ts');
	const post = read('nodes/Postoria/descriptions/post.ts');
	const media = read('nodes/Postoria/descriptions/media.ts');
	const other = read('nodes/Postoria/descriptions/other.ts');
	for (const resource of ['post', 'media', 'workspace', 'socialAccount', 'queue']) {
		assert.match(
			main + read('nodes/Postoria/descriptions/common.ts'),
			new RegExp(`value: '${resource}'`),
		);
	}
	for (const operation of ['create', 'get', 'getMany', 'delete']) {
		assert.match(post, new RegExp(`value: '${operation}'`));
	}
	for (const operation of ['uploadBinary', 'importFromUrl', 'get']) {
		assert.match(media, new RegExp(`value: '${operation}'`));
	}
	assert.equal((other.match(/value: 'getMany'/g) || []).length, 3);
});

test('Postoria API routes match the v1 contract', () => {
	const sources = [
		read('nodes/Postoria/actions/post.ts'),
		read('nodes/Postoria/actions/media.ts'),
		read('nodes/Postoria/actions/other.ts'),
	].join('\n');
	const expectedRoutes = [
		'/v1/workspaces',
		'/social-accounts',
		'/queues',
		'/media/uploads',
		'/media/imports',
		'/complete',
		'/posts',
	];
	for (const route of expectedRoutes) assert.ok(sources.includes(route), route);
});

test('media processing uses the agreed five-second interval and ten-minute default timeout', () => {
	assert.equal(constants.MEDIA_POLL_INTERVAL_MS, 5000);
	assert.equal(constants.DEFAULT_MEDIA_TIMEOUT_SECONDS, 600);
	assert.equal(constants.MAX_MEDIA_TIMEOUT_SECONDS, 3600);
	const source = read('nodes/Postoria/actions/media.ts');
	assert.match(source, /media\.status === 'ready' && media\.file_id != null/);
	assert.match(source, /media\.status === 'failed'/);
});

test('supported binary upload formats match the public API contract', () => {
	assert.deepEqual(constants.SUPPORTED_UPLOAD_TYPES, {
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'image/webp': ['.webp'],
		'image/gif': ['.gif'],
		'video/mp4': ['.mp4'],
		'video/quicktime': ['.mov'],
		'application/pdf': ['.pdf'],
	});
});

test('explicit date-time offsets preserve the represented instant', () => {
	assert.equal(toUtcIso('2026-08-01T12:00:00+03:00', 'Europe/Tallinn'), '2026-08-01T09:00:00.000Z');
	assert.equal(toUtcIso('2026-08-01T09:00:00Z', 'America/New_York'), '2026-08-01T09:00:00.000Z');
});

test('local date-time values use the workflow timezone', () => {
	assert.equal(toUtcIso('2026-08-01T12:00:00', 'Europe/Tallinn'), '2026-08-01T09:00:00.000Z');
	assert.equal(toUtcIso('2026-01-15T12:00:00', 'Europe/Tallinn'), '2026-01-15T10:00:00.000Z');
});

test('nonexistent daylight-saving local time is rejected', () => {
	assert.throws(() => toUtcIso('2026-03-08T02:30:00', 'America/New_York'), /does not exist/);
});

test('node metadata, example workflow, and SVG icons are valid distributable assets', () => {
	const metadata = JSON.parse(read('nodes/Postoria/Postoria.node.json'));
	const example = JSON.parse(read('examples/schedule-post.json'));
	assert.equal(metadata.node, '@postoria/n8n-nodes-postoria');
	assert.equal(
		example.nodes.some((node) => node.type === '@postoria/n8n-nodes-postoria.postoria'),
		true,
	);
	for (const icon of ['nodes/Postoria/postoria.svg', 'nodes/Postoria/postoria.dark.svg']) {
		const svg = read(icon);
		assert.match(svg, /^<svg[\s>]/);
		assert.match(svg, /viewBox="0 0 512\.000000 512\.000000"/);
		assert.match(svg, /<path\s+d=/);
	}
});

test('source follows strict n8n Cloud lint patterns fixed for the initial release', () => {
	const main = read('nodes/Postoria/Postoria.node.ts');
	const media = read('nodes/Postoria/actions/media.ts');
	const common = read('nodes/Postoria/descriptions/common.ts');
	const post = read('nodes/Postoria/descriptions/post.ts');
	const dateTime = read('nodes/Postoria/shared/dateTime.ts');

	assert.doesNotMatch(main, /throw error;/);
	assert.match(main, /throw new NodeApiError/);
	assert.match(main, /throw new NodeOperationError/);
	assert.doesNotMatch(media, /\bsetTimeout\s*\(/);
	assert.match(media, /NodeOperationError, sleep/);
	assert.doesNotMatch(dateTime, /catch\s*\{\s*throw new Error/);

	const resourceNames = [...common.matchAll(/name: '(Media|Post|Queue|Social Account|Workspace)'/g)]
		.slice(0, 5)
		.map((match) => match[1]);
	assert.deepEqual(resourceNames, ['Media', 'Post', 'Queue', 'Social Account', 'Workspace']);
	assert.equal((post.match(/displayName: 'Social Account Names or IDs'/g) || []).length, 2);
	assert.match(post, /Whether to return all results or only up to a given limit/);
	assert.match(post, /Max number of results to return/);
});

test('build copies the codex metadata into the distributable directory', () => {
	assert.equal(packageJson.scripts.build.includes('scripts/copy-static-assets.cjs'), true);
	assert.equal(fs.existsSync(path.join(root, 'scripts/copy-static-assets.cjs')), true);
});

test('compiled distribution contains every n8n entry point and icon', () => {
	for (const relativePath of [
		'dist/credentials/PostoriaApi.credentials.js',
		'dist/nodes/Postoria/Postoria.node.js',
		'dist/nodes/Postoria/Postoria.node.json',
		'dist/nodes/Postoria/postoria.svg',
		'dist/nodes/Postoria/postoria.dark.svg',
	]) {
		assert.equal(fs.existsSync(path.join(root, relativePath)), true, relativePath);
	}
});

test('network filters use the canonical Public API values', () => {
	const constantsSource = read('nodes/Postoria/shared/constants.ts');

	for (const value of ['linkedin', 'tiktok', 'youtube']) {
		assert.match(constantsSource, new RegExp(`value: '${value}'`));
	}

	for (const value of ['linked_in', 'tik_tok', 'you_tube']) {
		assert.doesNotMatch(constantsSource, new RegExp(`value: '${value}'`));
	}

	assert.doesNotMatch(constantsSource, /name: 'Reddit'/);
});
