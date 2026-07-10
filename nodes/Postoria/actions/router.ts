import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { executeMediaOperation } from './media';
import { executeOtherResourceOperation } from './other';
import { executePostOperation } from './post';

export async function executeOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const resource = this.getNodeParameter('resource', itemIndex) as string;

	if (resource === 'post') {
		return executePostOperation.call(this, itemIndex);
	}
	if (resource === 'media') {
		return executeMediaOperation.call(this, itemIndex);
	}
	if (resource === 'workspace' || resource === 'socialAccount' || resource === 'queue') {
		return executeOtherResourceOperation.call(this, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, {
		itemIndex,
	});
}
