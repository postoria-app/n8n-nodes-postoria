import type { INodeProperties } from 'n8n-workflow';
import { DEFAULT_MEDIA_TIMEOUT_SECONDS, MAX_MEDIA_TIMEOUT_SECONDS } from '../shared/constants';

const showMedia = {
	resource: ['media'],
};

const showUpload = {
	resource: ['media'],
	operation: ['uploadBinary'],
};

const showImport = {
	resource: ['media'],
	operation: ['importFromUrl'],
};

const showGet = {
	resource: ['media'],
	operation: ['get'],
};

export const mediaProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showMedia,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get media',
				description: 'Get the current status of a media item',
			},
			{
				name: 'Import From URL',
				value: 'importFromUrl',
				action: 'Import media from a URL',
				description: 'Import media from a public HTTPS URL and wait until it is ready',
			},
			{
				name: 'Upload Binary',
				value: 'uploadBinary',
				action: 'Upload binary media',
				description: 'Upload n8n binary data and wait until the media is ready',
			},
		],
		default: 'uploadBinary',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		typeOptions: {
			binaryDataProperty: true,
		},
		displayOptions: {
			show: showUpload,
		},
		default: 'data',
		required: true,
		description: 'Name of the input binary field containing the file to upload',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		displayOptions: {
			show: showUpload,
		},
		default: '',
		placeholder: 'image.jpg',
		description: 'File name to send to Postoria. Leave empty to use the binary metadata.',
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		displayOptions: {
			show: showUpload,
		},
		options: [
			{ name: 'From Binary Metadata', value: '' },
			{ name: 'GIF Image', value: 'image/gif' },
			{ name: 'JPEG Image', value: 'image/jpeg' },
			{ name: 'MP4 Video', value: 'video/mp4' },
			{ name: 'PDF Document', value: 'application/pdf' },
			{ name: 'PNG Image', value: 'image/png' },
			{ name: 'QuickTime Video', value: 'video/quicktime' },
			{ name: 'WebP Image', value: 'image/webp' },
		],
		default: '',
		description: 'MIME type to send to Postoria. Leave unchanged to use the binary metadata.',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		displayOptions: {
			show: showImport,
		},
		default: '',
		required: true,
		placeholder: 'https://example.com/image.jpg',
		description: 'Public HTTPS URL of the media to import',
	},
	{
		displayName: 'Processing Timeout',
		name: 'processingTimeout',
		type: 'number',
		typeOptions: {
			minValue: 5,
			maxValue: MAX_MEDIA_TIMEOUT_SECONDS,
		},
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['uploadBinary', 'importFromUrl'],
			},
		},
		default: DEFAULT_MEDIA_TIMEOUT_SECONDS,
		description:
			'Maximum number of seconds to wait for processing. The media status is checked every 5 seconds.',
	},
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: showGet,
		},
		default: 0,
		required: true,
		description: 'ID of the media item to retrieve',
	},
];
