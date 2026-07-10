import type { INodeProperties } from 'n8n-workflow';

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Media',
			value: 'media',
		},
		{
			name: 'Post',
			value: 'post',
		},
		{
			name: 'Queue',
			value: 'queue',
		},
		{
			name: 'Social Account',
			value: 'socialAccount',
		},
		{
			name: 'Workspace',
			value: 'workspace',
		},
	],
	default: 'post',
};

export const workspaceProperty: INodeProperties = {
	displayName: 'Workspace',
	name: 'workspaceId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	displayOptions: {
		show: {
			resource: ['post', 'media', 'socialAccount', 'queue'],
		},
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchWorkspaces',
				searchable: true,
				slowLoadNotice: {
					message: 'If loading takes longer than expected, select the workspace by ID',
					timeout: 10_000,
				},
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: '123',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[1-9]\\d*$',
						errorMessage: 'The workspace ID must be a positive integer',
					},
				},
			],
		},
	],
};

export const queueLocatorProperty: INodeProperties = {
	displayName: 'Queue',
	name: 'queueId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	displayOptions: {
		show: {
			resource: ['post'],
			operation: ['create'],
			publishMode: ['queue'],
		},
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchQueues',
				searchable: true,
				slowLoadNotice: {
					message: 'If loading takes longer than expected, select the queue by ID',
					timeout: 10_000,
				},
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: '456',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[1-9]\\d*$',
						errorMessage: 'The queue ID must be a positive integer',
					},
				},
			],
		},
	],
};

export const simplifyPostProperty: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description: 'Whether to return only the post ID, status, date, queue ID, and account results',
	displayOptions: {
		show: {
			resource: ['post'],
			operation: ['create', 'get', 'getMany'],
		},
	},
};
