import type { INodeProperties } from 'n8n-workflow';

export const otherResourceProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workspace'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many workspaces',
				description: 'Get all workspaces available to the API key',
			},
		],
		default: 'getMany',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['socialAccount'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many social accounts',
				description: 'Get all social accounts in a workspace',
			},
		],
		default: 'getMany',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['queue'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many queues',
				description: 'Get all queues in a workspace',
			},
		],
		default: 'getMany',
	},
];
