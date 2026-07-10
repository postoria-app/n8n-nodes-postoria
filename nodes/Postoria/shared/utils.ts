import type { IDataObject, JsonValue, NodeParameterValueType } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { SUPPORTED_UPLOAD_TYPES } from './constants';
import type { PostResponse, PostoriaErrorOutput } from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toJsonValue(value: unknown): JsonValue {
	if (value === undefined) {
		return null;
	}

	try {
		return JSON.parse(JSON.stringify(value)) as JsonValue;
	} catch {
		return String(value);
	}
}

export function extractResourceLocatorValue(value: unknown): string | number {
	if (isRecord(value) && ('value' in value || 'cachedResultUrl' in value)) {
		const locatorValue = value.value;
		if (typeof locatorValue === 'string' || typeof locatorValue === 'number') {
			return locatorValue;
		}
	}

	if (typeof value === 'string' || typeof value === 'number') {
		return value;
	}

	throw new Error('A resource ID is required');
}

export function parsePositiveInteger(value: unknown, fieldName: string): number {
	const extracted = extractResourceLocatorValue(value);
	const numericValue = typeof extracted === 'number' ? extracted : Number(extracted.trim());

	if (!Number.isSafeInteger(numericValue) || numericValue <= 0) {
		throw new Error(`${fieldName} must be a positive integer`);
	}

	return numericValue;
}

export function parsePositiveIntegerList(value: unknown, fieldName: string): number[] {
	let values: unknown[];

	if (Array.isArray(value)) {
		values = value;
	} else if (typeof value === 'string') {
		values = value
			.split(',')
			.map((part) => part.trim())
			.filter(Boolean);
	} else if (typeof value === 'number') {
		values = [value];
	} else if (value === undefined || value === null || value === '') {
		return [];
	} else {
		throw new Error(`${fieldName} must contain positive integer IDs`);
	}

	const parsed = values.map((entry) => {
		const candidate = isRecord(entry) && 'value' in entry ? entry.value : entry;
		const numericValue =
			typeof candidate === 'number' ? candidate : Number(String(candidate).trim());
		if (!Number.isSafeInteger(numericValue) || numericValue <= 0) {
			throw new Error(`${fieldName} must contain only positive integer IDs`);
		}
		return numericValue;
	});

	return [...new Set(parsed)];
}

export function parseStringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((entry) => String(entry).trim()).filter(Boolean);
	}

	if (typeof value === 'string') {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}

	if (value === undefined || value === null || value === '') {
		return [];
	}

	return [String(value).trim()].filter(Boolean);
}

export function optionalString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	const normalized = String(value).trim();
	return normalized || undefined;
}

export function compactObject(value: Record<string, unknown>): IDataObject {
	const output: IDataObject = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === undefined || entry === null || entry === '') {
			continue;
		}
		if (Array.isArray(entry) && entry.length === 0) {
			continue;
		}
		if (isRecord(entry)) {
			const compacted = compactObject(entry);
			if (Object.keys(compacted).length > 0) {
				output[key] = compacted;
			}
			continue;
		}
		output[key] = entry as NodeParameterValueType;
	}
	return output;
}

export function simplifyPost(post: PostResponse): IDataObject {
	return {
		id: post.id,
		status: post.status,
		date: post.date ?? null,
		queue_id: post.queue_id ?? null,
		results: post.results ?? [],
	};
}

export function errorToOutput(error: unknown): PostoriaErrorOutput {
	const output: PostoriaErrorOutput = {
		message: error instanceof Error ? error.message : String(error),
	};

	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		if (error.description) {
			output.description = error.description;
		}

		const context = error.context;
		if (typeof context.code === 'string') output.code = context.code;
		if (typeof context.param === 'string') output.param = context.param;
		if (context.details !== undefined) output.details = toJsonValue(context.details);
		if (typeof context.request_id === 'string') output.request_id = context.request_id;
		if (typeof context.http_code === 'string') output.http_code = context.http_code;
		if (typeof context.http_code === 'number') output.http_code = String(context.http_code);
		if (typeof context.media_id === 'number') output.media_id = context.media_id;
	}

	return output;
}

export function fileExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf('.');
	return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}

export function validateUploadMetadata(fileName: string, contentType: string): void {
	if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
		throw new Error('File Name must be a file name only, not a path');
	}

	const allowedExtensions = SUPPORTED_UPLOAD_TYPES[contentType.toLowerCase()];
	if (!allowedExtensions) {
		throw new Error(
			`Content Type must be one of: ${Object.keys(SUPPORTED_UPLOAD_TYPES).join(', ')}`,
		);
	}

	const extension = fileExtension(fileName);
	if (!extension) {
		throw new Error('File Name must include a supported file extension');
	}

	if (!allowedExtensions.includes(extension)) {
		throw new Error(
			`The ${extension} extension is not allowed for ${contentType}; allowed extensions: ${allowedExtensions.join(', ')}`,
		);
	}
}

export function networkDisplayName(network: string): string {
	const names: Record<string, string> = {
		facebook: 'Facebook',
		instagram: 'Instagram',
		linkedin: 'LinkedIn',
		linked_in: 'LinkedIn',
		google_business_profile: 'Google Business Profile',
		threads: 'Threads',
		x: 'X',
		pinterest: 'Pinterest',
		youtube: 'YouTube',
		you_tube: 'YouTube',
		tiktok: 'TikTok',
		tik_tok: 'TikTok',
		telegram: 'Telegram',
		bluesky: 'Bluesky',
		reddit: 'Reddit',
		tumblr: 'Tumblr',
	};
	return names[network] ?? network;
}
