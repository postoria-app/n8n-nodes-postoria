import type { INodeProperties } from 'n8n-workflow';
import {
	CONTENT_TYPE_OPTIONS,
	NETWORK_OPTIONS,
	POST_STATUS_OPTIONS,
	REPOST_FREQUENCY_OPTIONS,
} from '../shared/constants';
import { queueLocatorProperty } from './common';

const showPost = {
	resource: ['post'],
};

const showCreate = {
	resource: ['post'],
	operation: ['create'],
};

const showGet = {
	resource: ['post'],
	operation: ['get'],
};

const showGetMany = {
	resource: ['post'],
	operation: ['getMany'],
};

const showDelete = {
	resource: ['post'],
	operation: ['delete'],
};

export const postProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showPost,
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a post',
				description: 'Publish a post now, schedule it, or add it to a queue',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a post',
				description: 'Delete a post',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a post',
				description: 'Get a post by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many posts',
				description: 'Get many posts from a workspace',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Publish Mode',
		name: 'publishMode',
		type: 'options',
		displayOptions: {
			show: showCreate,
		},
		options: [
			{
				name: 'Publish Now',
				value: 'publish_now',
				description: 'Start publishing immediately',
			},
			{
				name: 'Schedule',
				value: 'schedule',
				description: 'Publish at a specific date and time',
			},
			{
				name: 'Add to Queue',
				value: 'queue',
				description: 'Add the post to a Postoria queue',
			},
		],
		default: 'publish_now',
	},
	{
		displayName: 'Social Account Names or IDs',
		name: 'socialAccountIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getSocialAccounts',
			loadOptionsDependsOn: ['workspaceId.value'],
		},
		displayOptions: {
			show: showCreate,
		},
		default: [],
		required: true,
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Scheduled Time',
		name: 'scheduledTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				...showCreate,
				publishMode: ['schedule'],
			},
		},
		default: '',
		required: true,
		description:
			'Date and time to publish. Local values are interpreted in the workflow timezone and sent as UTC.',
	},
	queueLocatorProperty,
	{
		displayName: 'Caption',
		name: 'caption',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: showCreate,
		},
		default: '',
		description: 'Caption or text content of the post',
	},
	{
		displayName: 'Media IDs',
		name: 'mediaIds',
		type: 'string',
		displayOptions: {
			show: showCreate,
		},
		default: '',
		placeholder: '101, 102',
		description:
			'Comma-separated Postoria media IDs. An expression may also return an array of IDs. Every media item must have ready status.',
	},
	{
		displayName: 'Link URL',
		name: 'linkUrl',
		type: 'string',
		displayOptions: {
			show: showCreate,
		},
		default: '',
		placeholder: 'https://example.com/article',
		description: 'Link to include in the post',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		typeOptions: {
			multipleValueButtonText: 'Add Field',
		},
		displayOptions: {
			show: showCreate,
		},
		default: {},
		options: [
			{
				displayName: 'Comment Delay',
				name: 'commentDelay',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 120,
				},
				default: 0,
				description: 'Delay before publishing the first comment, from 0 to 120 minutes',
			},
			{
				displayName: 'Content Type Override',
				name: 'contentType',
				type: 'options',
				options: CONTENT_TYPE_OPTIONS,
				default: 'text',
				description:
					'Override the content type. Normally Postoria infers it from the media, link, and caption.',
			},
			{
				displayName: 'First Comment',
				name: 'firstComment',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'Comment to publish after the post',
			},
			{
				displayName: 'Repost Frequency',
				name: 'repostFrequency',
				type: 'options',
				options: REPOST_FREQUENCY_OPTIONS,
				default: 'every7_day',
				description: 'How often to repeat the post',
			},
			{
				displayName: 'Repost Until',
				name: 'repostUntil',
				type: 'dateTime',
				default: '',
				description:
					'Date and time after which repeating stops. Local values use the workflow timezone.',
			},
		],
	},
	{
		displayName: 'YouTube Options',
		name: 'youtubeOptions',
		type: 'collection',
		typeOptions: {
			multipleValueButtonText: 'Add Option',
		},
		displayOptions: {
			show: showCreate,
		},
		default: {},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'YouTube category name or ID accepted by Postoria',
			},
			{
				displayName: 'Made for Kids',
				name: 'madeForKids',
				type: 'boolean',
				default: false,
				description: 'Whether the video is made for children',
			},
			{
				displayName: 'Recording Date',
				name: 'recordingDate',
				type: 'dateTime',
				default: '',
				description: 'Recording date. Local values use the workflow timezone.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'automation, social media',
				description: 'Comma-separated YouTube tags',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'YouTube video title',
			},
			{
				displayName: 'Video Language',
				name: 'videoLanguage',
				type: 'string',
				default: '',
				placeholder: 'en',
				description: 'YouTube video language code',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				options: [
					{ name: 'Private', value: 'private' },
					{ name: 'Public', value: 'public' },
					{ name: 'Unlisted', value: 'unlisted' },
				],
				default: 'private',
				description: 'YouTube video visibility',
			},
		],
	},
	{
		displayName: 'TikTok Options',
		name: 'tiktokOptions',
		type: 'collection',
		typeOptions: {
			multipleValueButtonText: 'Add Option',
		},
		displayOptions: {
			show: showCreate,
		},
		default: {},
		options: [
			{
				displayName: 'Allow Comments',
				name: 'allowComments',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Allow Duet',
				name: 'allowDuet',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Allow Stitch',
				name: 'allowStitch',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Auto Add Music',
				name: 'autoAddMusic',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Branded Content',
				name: 'brandedContent',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Disclose Post Content',
				name: 'disclosePostContent',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Photo Title',
				name: 'photoTitle',
				type: 'string',
				default: '',
				description: 'Title for a TikTok photo post',
			},
			{
				displayName: 'Who Can Watch',
				name: 'whoCanWatch',
				type: 'options',
				options: [
					{ name: 'Followers', value: 'followers' },
					{ name: 'Friends', value: 'friends' },
					{ name: 'Private', value: 'private' },
					{ name: 'Public', value: 'public' },
				],
				default: 'public',
			},
			{
				displayName: 'Your Brand',
				name: 'yourBrand',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: showGet,
		},
		default: 0,
		required: true,
		description: 'ID of the post to retrieve',
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: showDelete,
		},
		default: 0,
		required: true,
		description: 'ID of the post to delete',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showGetMany,
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 10_000,
		},
		displayOptions: {
			show: {
				...showGetMany,
				returnAll: [false],
			},
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		typeOptions: {
			multipleValueButtonText: 'Add Filter',
		},
		displayOptions: {
			show: showGetMany,
		},
		default: {},
		options: [
			{
				displayName: 'Date From',
				name: 'dateFrom',
				type: 'dateTime',
				default: '',
				description: 'Only return posts at or after this date and time',
			},
			{
				displayName: 'Date To',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				description: 'Only return posts before this date and time',
			},
			{
				displayName: 'Networks',
				name: 'networks',
				type: 'multiOptions',
				options: NETWORK_OPTIONS,
				default: [],
				description: 'Only return posts for these networks',
			},
			{
				displayName: 'Queue Name or ID',
				name: 'queueFilterId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQueues',
					loadOptionsDependsOn: ['workspaceId.value'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Social Account Names or IDs',
				name: 'accountIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getSocialAccounts',
					loadOptionsDependsOn: ['workspaceId.value'],
				},
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: POST_STATUS_OPTIONS,
				default: 'scheduled',
				description: 'Only return posts with this status',
			},
		],
	},
];
