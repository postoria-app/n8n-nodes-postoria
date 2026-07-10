import type { INodePropertyOptions } from 'n8n-workflow';

export const POSTORIA_API_BASE_URL = 'https://api.postoria.io';
export const MEDIA_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_MEDIA_TIMEOUT_SECONDS = 600;
export const MAX_MEDIA_TIMEOUT_SECONDS = 3_600;
export const MAX_POSTS_PAGE_SIZE = 100;

export const NETWORK_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Bluesky', value: 'bluesky' },
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Google Business Profile', value: 'google_business_profile' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Telegram', value: 'telegram' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'TikTok', value: 'tiktok' },
	{ name: 'Tumblr', value: 'tumblr' },
	{ name: 'X', value: 'x' },
	{ name: 'YouTube', value: 'youtube' },
];

export const POST_STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Draft', value: 'draft' },
	{ name: 'In Progress', value: 'in_progress' },
	{ name: 'Posted', value: 'posted' },
	{ name: 'Queued', value: 'queued' },
	{ name: 'Scheduled', value: 'scheduled' },
];

export const CONTENT_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Carousel', value: 'carousel' },
	{ name: 'Image', value: 'image' },
	{ name: 'Link', value: 'link' },
	{ name: 'Reel', value: 'reel' },
	{ name: 'Story', value: 'story' },
	{ name: 'Text', value: 'text' },
	{ name: 'Video', value: 'video' },
];

export const REPOST_FREQUENCY_OPTIONS: INodePropertyOptions[] = [
	...Array.from({ length: 60 }, (_, index) => {
		const days = index + 1;
		return {
			name: days === 1 ? 'Every Day' : `Every ${days} Days`,
			value: `every${days}_day`,
		};
	}),
	{ name: 'Every Month', value: 'every1_month' },
	{ name: 'Every 2 Months', value: 'every2_month' },
	{ name: 'Every 3 Months', value: 'every3_month' },
	{ name: 'Every 4 Months', value: 'every4_month' },
	{ name: 'Every 6 Months', value: 'every6_month' },
	{ name: 'Every Year', value: 'every1_year' },
];

export const SUPPORTED_UPLOAD_TYPES: Readonly<Record<string, readonly string[]>> = {
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/webp': ['.webp'],
	'image/gif': ['.gif'],
	'video/mp4': ['.mp4'],
	'video/quicktime': ['.mov'],
	'application/pdf': ['.pdf'],
};
