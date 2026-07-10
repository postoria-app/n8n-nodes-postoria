import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { postoriaApiRequest } from '../shared/transport';
import type { PostoriaListResponse, QueueResponse, SocialAccountResponse } from '../shared/types';
import {
	extractResourceLocatorValue,
	networkDisplayName,
	parsePositiveInteger,
} from '../shared/utils';

function currentWorkspaceId(context: ILoadOptionsFunctions): number | undefined {
	const rawValue = context.getCurrentNodeParameter('workspaceId', { extractValue: true });
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return undefined;
	}

	try {
		return parsePositiveInteger(extractResourceLocatorValue(rawValue), 'Workspace ID');
	} catch {
		return undefined;
	}
}

export async function getSocialAccounts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const workspaceId = currentWorkspaceId(this);
	if (!workspaceId) return [];

	const response = await (postoriaApiRequest<PostoriaListResponse<SocialAccountResponse>>).call(
		this,
		'GET',
		`/v1/workspaces/${workspaceId}/social-accounts`,
	);

	return [...response.data]
		.sort((left, right) => left.name.localeCompare(right.name))
		.map((account) => ({
			name: `${account.name} (${networkDisplayName(account.network)})`,
			value: account.id,
			description: account.description ?? undefined,
		}));
}

export async function getQueues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const workspaceId = currentWorkspaceId(this);
	if (!workspaceId) return [];

	const response = await (postoriaApiRequest<PostoriaListResponse<QueueResponse>>).call(
		this,
		'GET',
		`/v1/workspaces/${workspaceId}/queues`,
	);

	return [...response.data]
		.sort((left, right) => left.name.localeCompare(right.name))
		.map((queue) => ({
			name: queue.is_paused ? `${queue.name} (Paused)` : queue.name,
			value: queue.id,
		}));
}
