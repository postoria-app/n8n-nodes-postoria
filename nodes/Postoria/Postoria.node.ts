import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { executeOperation } from './actions/router';
import { resourceProperty, simplifyPostProperty, workspaceProperty } from './descriptions/common';
import { mediaProperties } from './descriptions/media';
import { otherResourceProperties } from './descriptions/other';
import { postProperties } from './descriptions/post';
import { getQueues, getSocialAccounts } from './methods/loadOptions';
import { searchQueues, searchWorkspaces } from './methods/listSearch';
import { errorToOutput } from './shared/utils';

export class Postoria implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postoria',
		name: 'postoria',
		icon: { light: 'file:postoria.svg', dark: 'file:postoria.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Publish, schedule, and manage social media content with Postoria',
		defaults: {
			name: 'Postoria',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'postoriaApi',
				required: true,
			},
		],
		properties: [
			resourceProperty,
			postProperties[0],
			mediaProperties[0],
			...otherResourceProperties,
			workspaceProperty,
			...postProperties.slice(1),
			...mediaProperties.slice(1),
			simplifyPostProperty,
		],
	};

	methods = {
		loadOptions: {
			getQueues,
			getSocialAccounts,
		},
		listSearch: {
			searchQueues,
			searchWorkspaces,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				const results = await executeOperation.call(this, itemIndex);
				for (const result of results) {
					returnData.push({
						json: result,
						pairedItem: { item: itemIndex },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: errorToOutput(error) },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeApiError) {
					error.context = { ...error.context, itemIndex };
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
						itemIndex,
					});
				}

				if (error instanceof NodeOperationError) {
					error.context = { ...error.context, itemIndex };
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}

				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
