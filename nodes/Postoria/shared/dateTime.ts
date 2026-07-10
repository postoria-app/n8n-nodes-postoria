interface LocalDateTimeParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
}

const LOCAL_DATE_TIME_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;
const EXPLICIT_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function parseLocalDateTime(value: string): LocalDateTimeParts {
	const match = LOCAL_DATE_TIME_PATTERN.exec(value);
	if (!match) {
		throw new Error('Date-time must be a valid ISO 8601 value');
	}

	const millisecondText = (match[7] ?? '').padEnd(3, '0');
	const parts: LocalDateTimeParts = {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
		hour: Number(match[4] ?? 0),
		minute: Number(match[5] ?? 0),
		second: Number(match[6] ?? 0),
		millisecond: Number(millisecondText || 0),
	};

	const validationDate = new Date(
		Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			parts.hour,
			parts.minute,
			parts.second,
			parts.millisecond,
		),
	);

	if (
		validationDate.getUTCFullYear() !== parts.year ||
		validationDate.getUTCMonth() + 1 !== parts.month ||
		validationDate.getUTCDate() !== parts.day ||
		validationDate.getUTCHours() !== parts.hour ||
		validationDate.getUTCMinutes() !== parts.minute ||
		validationDate.getUTCSeconds() !== parts.second ||
		validationDate.getUTCMilliseconds() !== parts.millisecond
	) {
		throw new Error('Date-time contains an invalid calendar date or time');
	}

	return parts;
}

function createFormatter(timeZone: string): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	});
}

function partsAt(formatter: Intl.DateTimeFormat, epochMilliseconds: number): LocalDateTimeParts {
	const values = new Map<string, string>();
	for (const part of formatter.formatToParts(new Date(epochMilliseconds))) {
		if (part.type !== 'literal') {
			values.set(part.type, part.value);
		}
	}

	return {
		year: Number(values.get('year')),
		month: Number(values.get('month')),
		day: Number(values.get('day')),
		hour: Number(values.get('hour')),
		minute: Number(values.get('minute')),
		second: Number(values.get('second')),
		millisecond: new Date(epochMilliseconds).getUTCMilliseconds(),
	};
}

function localPartsAsUtc(parts: LocalDateTimeParts): number {
	return Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
		parts.millisecond,
	);
}

function zoneOffsetAt(formatter: Intl.DateTimeFormat, epochMilliseconds: number): number {
	const roundedToSecond = Math.trunc(epochMilliseconds / 1_000) * 1_000;
	const zoned = partsAt(formatter, roundedToSecond);
	return localPartsAsUtc(zoned) - roundedToSecond;
}

function sameLocalTime(actual: LocalDateTimeParts, expected: LocalDateTimeParts): boolean {
	return (
		actual.year === expected.year &&
		actual.month === expected.month &&
		actual.day === expected.day &&
		actual.hour === expected.hour &&
		actual.minute === expected.minute &&
		actual.second === expected.second &&
		actual.millisecond === expected.millisecond
	);
}

/**
 * Converts an n8n date-time parameter to an ISO 8601 UTC instant.
 * Values that include Z or an explicit offset preserve that instant. Values without
 * an offset are interpreted in the workflow timezone. Non-existent local times at a
 * daylight-saving transition are rejected instead of being silently shifted.
 */
export function toUtcIso(value: string | Date, workflowTimezone: string): string {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			throw new Error('Date-time is invalid');
		}
		return value.toISOString();
	}

	const normalized = value.trim();
	if (!normalized) {
		throw new Error('Date-time is required');
	}

	if (EXPLICIT_OFFSET_PATTERN.test(normalized)) {
		const instant = new Date(normalized);
		if (Number.isNaN(instant.getTime())) {
			throw new Error('Date-time must be a valid ISO 8601 value');
		}
		return instant.toISOString();
	}

	const expected = parseLocalDateTime(normalized);
	const formatter = createFormatter(workflowTimezone);
	const expectedAsUtc = localPartsAsUtc(expected);
	const offsetSamples = new Set<number>();

	for (const hours of [-36, -12, 0, 12, 36]) {
		offsetSamples.add(zoneOffsetAt(formatter, expectedAsUtc + hours * 60 * 60 * 1_000));
	}

	const candidates = [...offsetSamples]
		.map((offset) => expectedAsUtc - offset)
		.filter((candidate) => sameLocalTime(partsAt(formatter, candidate), expected))
		.sort((left, right) => left - right);

	if (candidates.length === 0) {
		throw new Error(
			`The local time ${normalized} does not exist in timezone ${workflowTimezone} because of a daylight-saving transition`,
		);
	}

	return new Date(candidates[0]).toISOString();
}
