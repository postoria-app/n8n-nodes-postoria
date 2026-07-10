import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import { DEFAULT_MEDIA_TIMEOUT_SECONDS, MEDIA_POLL_INTERVAL_MS } from '../shared/constants';
import { postoriaApiRequest, uploadToSignedUrl } from '../shared/transport';
import type { MediaResponse, MediaUploadResponse } from '../shared/types';
import { optionalString, parsePositiveInteger, validateUploadMetadata } from '../shared/utils';

function getWorkspaceId(context: IExecuteFunctions, itemIndex: number): number {
	return parsePositiveInteger(
		context.getNodeParameter('workspaceId', itemIndex, undefined, { extractValue: true }),
		'Workspace ID',
	);
}

function mediaProcessingError(
	context: IExecuteFunctions,
	media: MediaResponse,
	itemIndex: number,
): NodeOperationError {
	const error = new NodeOperationError(
		context.getNode(),
		media.error_message || 'Postoria could not process the media item',
		{
			itemIndex,
			description: `Media ID: ${media.id}`,
		},
	);
	error.context = {
		itemIndex,
		media_id: media.id,
		code: media.error_code ?? 'media_processing_failed',
	};
	return error;
}

function mediaTimeoutError(
	context: IExecuteFunctions,
	mediaId: number,
	timeoutSeconds: number,
	itemIndex: number,
): NodeOperationError {
	const error = new NodeOperationError(
		context.getNode(),
		`Media processing did not finish within ${timeoutSeconds} seconds`,
		{
			itemIndex,
			description: `The media record remains available in Postoria as ID ${mediaId}.`,
		},
	);
	error.context = {
		itemIndex,
		media_id: mediaId,
		code: 'media_processing_timeout',
	};
	return error;
}

async function waitForMediaReady(
	context: IExecuteFunctions,
	workspaceId: number,
	initialMedia: MediaResponse,
	timeoutSeconds: number,
	itemIndex: number,
): Promise<MediaResponse> {
	const deadline = Date.now() + timeoutSeconds * 1_000;
	let media = initialMedia;

	while (true) {
		if (media.status === 'ready' && media.file_id != null) {
			return media;
		}

		if (media.status === 'failed') {
			throw mediaProcessingError(context, media, itemIndex);
		}

		const remaining = deadline - Date.now();
		if (remaining <= 0) {
			throw mediaTimeoutError(context, media.id, timeoutSeconds, itemIndex);
		}

		await sleep(Math.min(MEDIA_POLL_INTERVAL_MS, remaining));
		media = await (postoriaApiRequest<MediaResponse>).call(
			context,
			'GET',
			`/v1/workspaces/${workspaceId}/media/${media.id}`,
		);
	}
}

function processingTimeout(context: IExecuteFunctions, itemIndex: number): number {
	const value = Number(
		context.getNodeParameter('processingTimeout', itemIndex, DEFAULT_MEDIA_TIMEOUT_SECONDS),
	);
	if (!Number.isFinite(value) || value < 5 || value > 3_600) {
		throw new NodeOperationError(
			context.getNode(),
			'Processing Timeout must be between 5 and 3600 seconds',
			{ itemIndex },
		);
	}
	return value;
}

async function uploadBinary(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const binaryPropertyName = String(
		context.getNodeParameter('binaryPropertyName', itemIndex, 'data'),
	);
	const binary = context.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const fileNameOverride = optionalString(context.getNodeParameter('fileName', itemIndex, ''));
	const fileName =
		fileNameOverride ??
		optionalString(binary.fileName) ??
		(binary.fileExtension ? `upload.${binary.fileExtension.replace(/^\./, '')}` : undefined);
	const contentTypeOverride = optionalString(
		context.getNodeParameter('contentType', itemIndex, ''),
	);
	const contentType = (contentTypeOverride ?? optionalString(binary.mimeType))?.toLowerCase();

	if (!fileName) {
		throw new NodeOperationError(
			context.getNode(),
			'File Name is missing from both the node parameter and binary metadata',
			{ itemIndex },
		);
	}
	if (!contentType) {
		throw new NodeOperationError(
			context.getNode(),
			'Content Type is missing from both the node parameter and binary metadata',
			{ itemIndex },
		);
	}

	try {
		validateUploadMetadata(fileName, contentType);
	} catch (error) {
		throw new NodeOperationError(context.getNode(), error as Error, { itemIndex });
	}

	const upload = await (postoriaApiRequest<MediaUploadResponse>).call(
		context,
		'POST',
		`/v1/workspaces/${workspaceId}/media/uploads`,
		{
			name: fileName,
			content_type: contentType,
		},
	);
	const mediaId = parsePositiveInteger(upload.id, 'Media ID');
	const signedUrl = upload.upload?.url;
	if (!signedUrl || typeof signedUrl !== 'string') {
		const error = new NodeOperationError(
			context.getNode(),
			'Postoria did not return a media upload URL',
			{
				itemIndex,
				description: `The media record was created as ID ${mediaId}.`,
			},
		);
		error.context = { itemIndex, media_id: mediaId, code: 'upload_url_missing' };
		throw error;
	}

	const buffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	await uploadToSignedUrl.call(context, signedUrl, buffer, contentType, mediaId);

	const completed = await (postoriaApiRequest<MediaResponse>).call(
		context,
		'POST',
		`/v1/workspaces/${workspaceId}/media/${mediaId}/complete`,
	);
	return [
		await waitForMediaReady(
			context,
			workspaceId,
			completed,
			processingTimeout(context, itemIndex),
			itemIndex,
		),
	];
}

async function importFromUrl(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const value = String(context.getNodeParameter('url', itemIndex)).trim();
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new NodeOperationError(context.getNode(), 'URL must be a valid absolute URL', {
			itemIndex,
		});
	}

	if (url.protocol !== 'https:') {
		throw new NodeOperationError(context.getNode(), 'URL must use HTTPS', { itemIndex });
	}

	const media = await (postoriaApiRequest<MediaResponse>).call(
		context,
		'POST',
		`/v1/workspaces/${workspaceId}/media/imports`,
		{ url: url.toString() },
	);
	return [
		await waitForMediaReady(
			context,
			workspaceId,
			media,
			processingTimeout(context, itemIndex),
			itemIndex,
		),
	];
}

async function getMedia(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const mediaId = parsePositiveInteger(context.getNodeParameter('mediaId', itemIndex), 'Media ID');
	const response = await (postoriaApiRequest<MediaResponse>).call(
		context,
		'GET',
		`/v1/workspaces/${workspaceId}/media/${mediaId}`,
	);
	return [response];
}

export async function executeMediaOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const workspaceId = getWorkspaceId(this, itemIndex);

	switch (operation) {
		case 'get':
			return getMedia(this, itemIndex, workspaceId);
		case 'importFromUrl':
			return importFromUrl(this, itemIndex, workspaceId);
		case 'uploadBinary':
			return uploadBinary(this, itemIndex, workspaceId);
		default:
			throw new NodeOperationError(this.getNode(), `Unsupported Media operation: ${operation}`, {
				itemIndex,
			});
	}
}
