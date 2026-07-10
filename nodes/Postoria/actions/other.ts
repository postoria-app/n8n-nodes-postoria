import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { postoriaApiRequest } from '../shared/transport';
import type {
	PostoriaListResponse,
	QueueResponse,
	SocialAccountResponse,
	WorkspaceResponse,
} from '../shared/types';
import { parsePositiveInteger } from '../shared/utils';

function getWorkspaceId(context: IExecuteFunctions, itemIndex: number): number {
	return parsePositiveInteger(
		context.getNodeParameter('workspaceId', itemIndex, undefined, { extractValue: true }),
		'Workspace ID',
	);
}

export async function executeOtherResourceOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const resource = this.getNodeParameter('resource', itemIndex) as string;
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	if (operation !== 'getMany') {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported ${resource} operation: ${operation}`,
			{ itemIndex },
		);
	}

	if (resource === 'workspace') {
		const response = await (postoriaApiRequest<PostoriaListResponse<WorkspaceResponse>>).call(
			this,
			'GET',
			'/v1/workspaces',
		);
		return response.data;
	}

	const workspaceId = getWorkspaceId(this, itemIndex);
	if (resource === 'socialAccount') {
		const response = await (postoriaApiRequest<PostoriaListResponse<SocialAccountResponse>>).call(
			this,
			'GET',
			`/v1/workspaces/${workspaceId}/social-accounts`,
		);
		return response.data;
	}

	if (resource === 'queue') {
		const response = await (postoriaApiRequest<PostoriaListResponse<QueueResponse>>).call(
			this,
			'GET',
			`/v1/workspaces/${workspaceId}/queues`,
		);
		return response.data;
	}

	throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, { itemIndex });
}
