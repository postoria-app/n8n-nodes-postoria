import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { MAX_POSTS_PAGE_SIZE } from '../shared/constants';
import { toUtcIso } from '../shared/dateTime';
import { postoriaApiRequest } from '../shared/transport';
import type { PostResponse, PostoriaListResponse } from '../shared/types';
import {
	compactObject,
	isRecord,
	optionalString,
	parsePositiveInteger,
	parsePositiveIntegerList,
	parseStringList,
	simplifyPost,
} from '../shared/utils';

function getWorkspaceId(context: IExecuteFunctions, itemIndex: number): number {
	const value = context.getNodeParameter('workspaceId', itemIndex, undefined, {
		extractValue: true,
	});
	return parsePositiveInteger(value, 'Workspace ID');
}

function parameterObject(
	context: IExecuteFunctions,
	name: string,
	itemIndex: number,
): Record<string, unknown> {
	const value = context.getNodeParameter(name, itemIndex, {}) as unknown;
	return isRecord(value) ? value : {};
}

function buildYouTubeOptions(
	context: IExecuteFunctions,
	itemIndex: number,
): IDataObject | undefined {
	const options = parameterObject(context, 'youtubeOptions', itemIndex);
	if (Object.keys(options).length === 0) return undefined;

	const recordingDate = optionalString(options.recordingDate);
	const tags = parseStringList(options.tags);
	const body = compactObject({
		title: optionalString(options.title),
		visibility: optionalString(options.visibility),
		category: optionalString(options.category),
		made_for_kids: options.madeForKids,
		video_language: optionalString(options.videoLanguage),
		recording_date: recordingDate ? toUtcIso(recordingDate, context.getTimezone()) : undefined,
		tags,
	});

	return Object.keys(body).length > 0 ? body : undefined;
}

function buildTikTokOptions(
	context: IExecuteFunctions,
	itemIndex: number,
): IDataObject | undefined {
	const options = parameterObject(context, 'tiktokOptions', itemIndex);
	if (Object.keys(options).length === 0) return undefined;

	const body = compactObject({
		who_can_watch: optionalString(options.whoCanWatch),
		allow_comments: options.allowComments,
		allow_duet: options.allowDuet,
		allow_stitch: options.allowStitch,
		disclose_post_content: options.disclosePostContent,
		your_brand: options.yourBrand,
		branded_content: options.brandedContent,
		photo_title: optionalString(options.photoTitle),
		auto_add_music: options.autoAddMusic,
	});

	return Object.keys(body).length > 0 ? body : undefined;
}

async function createPost(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const publishMode = context.getNodeParameter('publishMode', itemIndex) as string;
	const socialAccountIds = parsePositiveIntegerList(
		context.getNodeParameter('socialAccountIds', itemIndex, []),
		'Social Account IDs',
	);
	if (socialAccountIds.length === 0) {
		throw new NodeOperationError(context.getNode(), 'At least one social account is required', {
			itemIndex,
		});
	}

	const mediaIds = parsePositiveIntegerList(
		context.getNodeParameter('mediaIds', itemIndex, ''),
		'Media IDs',
	);
	const additionalFields = parameterObject(context, 'additionalFields', itemIndex);
	const scheduledTime =
		publishMode === 'schedule'
			? toUtcIso(
					String(context.getNodeParameter('scheduledTime', itemIndex)),
					context.getTimezone(),
				)
			: undefined;
	const queueId =
		publishMode === 'queue'
			? parsePositiveInteger(
					context.getNodeParameter('queueId', itemIndex, undefined, { extractValue: true }),
					'Queue ID',
				)
			: undefined;

	const repostUntil = optionalString(additionalFields.repostUntil);
	const repostFrequency = optionalString(additionalFields.repostFrequency);
	if (repostUntil && !repostFrequency) {
		throw new NodeOperationError(
			context.getNode(),
			'Repost Frequency is required when Repost Until is set',
			{ itemIndex },
		);
	}

	const repost =
		repostFrequency || repostUntil
			? compactObject({
					frequency: repostFrequency,
					until: repostUntil ? toUtcIso(repostUntil, context.getTimezone()) : undefined,
				})
			: undefined;

	const body = compactObject({
		publish_mode: publishMode,
		social_account_ids: socialAccountIds,
		content_type: optionalString(additionalFields.contentType),
		media_ids: mediaIds,
		caption: optionalString(context.getNodeParameter('caption', itemIndex, '')),
		link_url: optionalString(context.getNodeParameter('linkUrl', itemIndex, '')),
		first_comment: optionalString(additionalFields.firstComment),
		comment_delay:
			'commentDelay' in additionalFields ? Number(additionalFields.commentDelay) : undefined,
		scheduled_time: scheduledTime,
		queue_id: queueId,
		repost,
		youtube: buildYouTubeOptions(context, itemIndex),
		tiktok: buildTikTokOptions(context, itemIndex),
	});

	const response = await (postoriaApiRequest<PostResponse>).call(
		context,
		'POST',
		`/v1/workspaces/${workspaceId}/posts`,
		body,
	);
	const simplify = context.getNodeParameter('simplify', itemIndex, true) as boolean;
	return [simplify ? simplifyPost(response) : response];
}

async function getPost(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const postId = parsePositiveInteger(context.getNodeParameter('postId', itemIndex), 'Post ID');
	const response = await (postoriaApiRequest<PostResponse>).call(
		context,
		'GET',
		`/v1/workspaces/${workspaceId}/posts/${postId}`,
	);
	const simplify = context.getNodeParameter('simplify', itemIndex, true) as boolean;
	return [simplify ? simplifyPost(response) : response];
}

async function deletePost(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const postId = parsePositiveInteger(context.getNodeParameter('postId', itemIndex), 'Post ID');
	await (postoriaApiRequest<unknown>).call(
		context,
		'DELETE',
		`/v1/workspaces/${workspaceId}/posts/${postId}`,
	);
	return [{ deleted: true, post_id: postId }];
}

function buildListQuery(
	context: IExecuteFunctions,
	itemIndex: number,
): Omit<IDataObject, 'limit' | 'cursor'> {
	const filters = parameterObject(context, 'filters', itemIndex);
	const accountIds = parsePositiveIntegerList(filters.accountIds, 'Account IDs');
	const networks = parseStringList(filters.networks);
	const queueFilterValue = filters.queueFilterId;
	const queueId =
		queueFilterValue === undefined || queueFilterValue === null || queueFilterValue === ''
			? undefined
			: parsePositiveInteger(queueFilterValue, 'Queue ID');
	const dateFrom = optionalString(filters.dateFrom);
	const dateTo = optionalString(filters.dateTo);

	return compactObject({
		account_ids: accountIds,
		queue_id: queueId,
		status: optionalString(filters.status),
		networks,
		date_from: dateFrom ? toUtcIso(dateFrom, context.getTimezone()) : undefined,
		date_to: dateTo ? toUtcIso(dateTo, context.getTimezone()) : undefined,
	});
}

async function getManyPosts(
	context: IExecuteFunctions,
	itemIndex: number,
	workspaceId: number,
): Promise<IDataObject[]> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const requestedLimit = returnAll
		? Number.POSITIVE_INFINITY
		: Number(context.getNodeParameter('limit', itemIndex, 50));
	const baseQuery = buildListQuery(context, itemIndex);
	const posts: PostResponse[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;

	do {
		const remaining = requestedLimit - posts.length;
		if (remaining <= 0) break;

		const pageSize = returnAll ? MAX_POSTS_PAGE_SIZE : Math.min(MAX_POSTS_PAGE_SIZE, remaining);
		const query: IDataObject = {
			...baseQuery,
			limit: pageSize,
			...(cursor ? { cursor } : {}),
		};
		const response = await (postoriaApiRequest<PostoriaListResponse<PostResponse>>).call(
			context,
			'GET',
			`/v1/workspaces/${workspaceId}/posts`,
			undefined,
			query,
		);

		posts.push(...response.data.slice(0, remaining));
		if (!response.pagination.has_more) break;

		const nextCursor = response.pagination.next_cursor ?? undefined;
		if (!nextCursor) {
			throw new NodeOperationError(
				context.getNode(),
				'Postoria indicated that more posts are available but did not return a cursor',
				{ itemIndex },
			);
		}
		if (seenCursors.has(nextCursor)) {
			throw new NodeOperationError(
				context.getNode(),
				'Postoria returned the same pagination cursor more than once',
				{ itemIndex },
			);
		}
		seenCursors.add(nextCursor);
		cursor = nextCursor;
	} while (returnAll || posts.length < requestedLimit);

	const simplify = context.getNodeParameter('simplify', itemIndex, true) as boolean;
	return posts.map((post) => (simplify ? simplifyPost(post) : post));
}

export async function executePostOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const workspaceId = getWorkspaceId(this, itemIndex);

	switch (operation) {
		case 'create':
			return createPost(this, itemIndex, workspaceId);
		case 'delete':
			return deletePost(this, itemIndex, workspaceId);
		case 'get':
			return getPost(this, itemIndex, workspaceId);
		case 'getMany':
			return getManyPosts(this, itemIndex, workspaceId);
		default:
			throw new NodeOperationError(this.getNode(), `Unsupported Post operation: ${operation}`, {
				itemIndex,
			});
	}
}
