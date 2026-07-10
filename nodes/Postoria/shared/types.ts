import type { IDataObject, JsonValue } from 'n8n-workflow';

export type MediaStatus = 'waiting_for_upload' | 'processing' | 'ready' | 'failed';

export interface PostoriaPagination extends IDataObject {
	has_more: boolean;
	next_cursor?: string | null;
	next?: string | null;
}

export interface PostoriaListResponse<T> extends IDataObject {
	data: T[];
	pagination: PostoriaPagination;
}

export interface WorkspaceResponse extends IDataObject {
	id: number;
	name: string;
	timezone: string;
}

export interface SocialAccountResponse extends IDataObject {
	id: number;
	name: string;
	description?: string | null;
	network: string;
	url: string;
}

export interface QueueResponse extends IDataObject {
	id: number;
	name: string;
	is_paused: boolean;
}

export interface MediaResponse extends IDataObject {
	id: number;
	status: MediaStatus;
	file_id?: number | null;
	error_code?: string | null;
	error_message?: string | null;
}

export interface MediaUploadResponse extends IDataObject {
	id: number;
	status: MediaStatus;
	upload: {
		url: string;
	};
}

export interface PostAccountResult extends IDataObject {
	account_id: number;
	link_to_post?: string | null;
	error?: string | null;
}

export interface PostResponse extends IDataObject {
	id: number;
	status: string;
	date?: string | null;
	queue_id?: number | null;
	results: PostAccountResult[];
}

export interface PostoriaApiErrorData extends IDataObject {
	code?: string;
	message?: string;
	param?: string | null;
	details?: JsonValue;
	request_id?: string;
}

export interface PostoriaErrorOutput extends IDataObject {
	message: string;
	description?: string;
	code?: string;
	param?: string;
	details?: JsonValue;
	request_id?: string;
	http_code?: string;
	media_id?: number;
}
