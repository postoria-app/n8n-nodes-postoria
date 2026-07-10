import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { postoriaApiRequest } from '../shared/transport';
import type { PostoriaListResponse, QueueResponse, WorkspaceResponse } from '../shared/types';
import { extractResourceLocatorValue, parsePositiveInteger } from '../shared/utils';

function matchesFilter(value: string, filter?: string): boolean {
	return !filter || value.toLocaleLowerCase().includes(filter.toLocaleLowerCase());
}

export async function searchWorkspaces(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await (postoriaApiRequest<PostoriaListResponse<WorkspaceResponse>>).call(
		this,
		'GET',
		'/v1/workspaces',
	);

	const results: INodeListSearchItems[] = response.data
		.filter((workspace) => matchesFilter(workspace.name, filter))
		.sort((left, right) => left.name.localeCompare(right.name))
		.map((workspace) => ({
			name: workspace.name,
			value: workspace.id,
		}));

	return { results };
}

export async function searchQueues(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const rawWorkspaceId = this.getCurrentNodeParameter('workspaceId', { extractValue: true });
	if (rawWorkspaceId === undefined || rawWorkspaceId === null || rawWorkspaceId === '') {
		return { results: [] };
	}

	let workspaceId: number;
	try {
		workspaceId = parsePositiveInteger(extractResourceLocatorValue(rawWorkspaceId), 'Workspace ID');
	} catch {
		return { results: [] };
	}

	const response = await (postoriaApiRequest<PostoriaListResponse<QueueResponse>>).call(
		this,
		'GET',
		`/v1/workspaces/${workspaceId}/queues`,
	);

	const results: INodeListSearchItems[] = response.data
		.filter((queue) => matchesFilter(queue.name, filter))
		.sort((left, right) => left.name.localeCompare(right.name))
		.map((queue) => ({
			name: queue.is_paused ? `${queue.name} (Paused)` : queue.name,
			value: queue.id,
		}));

	return { results };
}
