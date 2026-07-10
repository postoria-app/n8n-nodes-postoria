import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class PostoriaApi implements ICredentialType {
	name = 'postoriaApi';

	displayName = 'Postoria API';

	icon: Icon = {
		light: 'file:../nodes/Postoria/postoria.svg',
		dark: 'file:../nodes/Postoria/postoria.dark.svg',
	};

	documentationUrl =
		'https://github.com/postoria-app/n8n-nodes-postoria?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create a Public API key in <a href="https://app.postoria.io/settings" target="_blank">Postoria Settings</a>',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.postoria.io',
			url: '/v1/workspaces',
			method: 'GET',
		},
	};
}
