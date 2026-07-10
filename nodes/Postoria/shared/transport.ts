import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { POSTORIA_API_BASE_URL } from './constants';
import { isRecord, toJsonValue } from './utils';
import type { PostoriaApiErrorData } from './types';

type RequestContext = IExecuteFunctions | ILoadOptionsFunctions;

function parsePossibleJson(value: unknown): unknown {
	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value) as unknown;
	} catch {
		return value;
	}
}

function nestedValue(source: unknown, path: string[]): unknown {
	let current = source;
	for (const key of path) {
		if (!isRecord(current)) return undefined;
		current = current[key];
	}
	return current;
}

function findResponseBody(error: unknown): unknown {
	const candidates = [
		// n8n's request helper wraps Axios response data in NodeApiError.context.data.
		nestedValue(error, ['context', 'data']),
		nestedValue(error, ['response', 'body']),
		nestedValue(error, ['response', 'data']),
		nestedValue(error, ['cause', 'response', 'body']),
		nestedValue(error, ['cause', 'response', 'data']),
		nestedValue(error, ['body']),
		nestedValue(error, ['errorResponse']),
		nestedValue(error, ['cause', 'errorResponse']),
	];

	for (const candidate of candidates) {
		if (candidate !== undefined) {
			return parsePossibleJson(candidate);
		}
	}

	return undefined;
}

function findHttpCode(error: unknown): string | undefined {
	const candidates = [
		nestedValue(error, ['statusCode']),
		nestedValue(error, ['status']),
		nestedValue(error, ['httpCode']),
		nestedValue(error, ['response', 'statusCode']),
		nestedValue(error, ['response', 'status']),
		nestedValue(error, ['cause', 'statusCode']),
		nestedValue(error, ['cause', 'response', 'status']),
	];

	for (const candidate of candidates) {
		if (typeof candidate === 'number' || typeof candidate === 'string') {
			return String(candidate);
		}
	}

	return undefined;
}

function findApiError(error: unknown): PostoriaApiErrorData | undefined {
	const responseBody = findResponseBody(error);
	const parsedBody = parsePossibleJson(responseBody);
	if (!isRecord(parsedBody)) {
		return undefined;
	}

	const candidate = isRecord(parsedBody.error) ? parsedBody.error : parsedBody;
	if (typeof candidate.message !== 'string' && typeof candidate.code !== 'string') {
		return undefined;
	}

	return {
		code: typeof candidate.code === 'string' ? candidate.code : undefined,
		message: typeof candidate.message === 'string' ? candidate.message : undefined,
		param: typeof candidate.param === 'string' ? candidate.param : undefined,
		details: candidate.details === undefined ? undefined : toJsonValue(candidate.details),
		request_id: typeof candidate.request_id === 'string' ? candidate.request_id : undefined,
	};
}

function toPostoriaNodeApiError(context: RequestContext, error: unknown): NodeApiError {
	const apiError = findApiError(error);

	// Preserve an existing n8n error only when it does not contain a structured
	// Postoria response. Otherwise re-wrap it so the API message, parameter,
	// details, and request ID are visible in the node UI.
	if (error instanceof NodeApiError && !apiError) {
		return error;
	}
	const httpCode = findHttpCode(error);
	const fallbackMessage =
		error instanceof NodeApiError
			? error.description || error.message
			: error instanceof Error
				? error.message
				: 'Postoria API request failed';
	const message = apiError?.message ?? fallbackMessage;
	const descriptionParts: string[] = [];

	if (apiError?.code) descriptionParts.push(`Code: ${apiError.code}`);
	if (apiError?.param) descriptionParts.push(`Parameter: ${apiError.param}`);
	if (apiError?.request_id) descriptionParts.push(`Request ID: ${apiError.request_id}`);

	const errorResponse: JsonObject = {
		message,
	};
	if (httpCode) errorResponse.statusCode = httpCode;
	if (apiError) errorResponse.body = { error: toJsonValue(apiError) };

	const nodeError = new NodeApiError(context.getNode(), errorResponse, {
		message,
		description: descriptionParts.join(' · ') || undefined,
		httpCode,
	});

	nodeError.context = {
		...(apiError?.code ? { code: apiError.code } : {}),
		...(apiError?.param ? { param: apiError.param } : {}),
		...(apiError?.details !== undefined ? { details: toJsonValue(apiError.details) } : {}),
		...(apiError?.request_id ? { request_id: apiError.request_id } : {}),
		...(httpCode ? { http_code: httpCode } : {}),
	};

	return nodeError;
}

export async function postoriaApiRequest<T>(
	this: RequestContext,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<T> {
	const options: IHttpRequestOptions = {
		method,
		baseURL: POSTORIA_API_BASE_URL,
		url: resource,
		json: true,
	};

	if (body !== undefined) options.body = body;
	if (qs !== undefined && Object.keys(qs).length > 0) {
		options.qs = qs;
		options.arrayFormat = 'repeat';
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'postoriaApi',
			options,
		)) as T;
	} catch (error) {
		throw toPostoriaNodeApiError(this, error);
	}
}

export async function uploadToSignedUrl(
	this: IExecuteFunctions,
	url: string,
	body: Buffer,
	contentType: string,
	mediaId: number,
): Promise<void> {
	try {
		await this.helpers.httpRequest({
			method: 'PUT',
			url,
			body,
			headers: {
				'Content-Type': contentType,
			},
			json: false,
			timeout: 300_000,
			sendCredentialsOnCrossOriginRedirect: false,
		});
	} catch (error) {
		const httpCode = findHttpCode(error);
		const uploadError = new NodeOperationError(
			this.getNode(),
			'Failed to upload binary data to Postoria storage',
			{
				description: httpCode
					? `The storage service returned HTTP ${httpCode}. The media record was created as ID ${mediaId}.`
					: `The media record was created as ID ${mediaId}.`,
			},
		);
		uploadError.context = {
			code: 'media_upload_failed',
			media_id: mediaId,
			...(httpCode ? { http_code: httpCode } : {}),
		};
		throw uploadError;
	}
}
