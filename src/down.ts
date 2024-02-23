import { sleep } from './utils/sleep';

const MAX_MB = 1024;
const DEFAULT_NUM_MB = 10;

export default async function (request: Request, env: any, ctx: ExecutionContext) {
	const { searchParams: qs } = new URL(request.url);

	const value = qs.get('size'); // in MB

	const numBytes = (value == null ? DEFAULT_NUM_MB : Math.min(MAX_MB, Math.abs(+value))) * 1e6;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const resInit: ResponseInit = {
		headers: {
			'access-control-allow-origin': '*',
			'timing-allow-origin': '*',
			'cache-control': 'public, max-age=172800',
			'content-type': 'application/octet-stream',
			'content-length': String(numBytes),
			'etag': value != null ? `W/"${numBytes}"` : 'W/"10MB"',
			'last-modified': today.toUTCString(),
			// 'cf-meta-colo': request.cf?.colo,
			// 'access-control-expose-headers': 'cf-meta-colo, cf-meta-request-time',
			// 'cf-meta-request-time': String(+reqTime),
		},
	};

	const chunkSize = 1024 * 1024 * 5; // Chunk size in bytes
	let bytesRemaining = numBytes;
	const chunk = new Uint8Array(Math.min(chunkSize, bytesRemaining));

	const stream = new ReadableStream({
		pull(controller) {
			if (bytesRemaining > 0) {
				controller.enqueue(chunk);
				bytesRemaining -= chunk.length;
			} else {
				controller.close();
			}
		},
	});

	const res = new Response(stream, resInit);

	return res;
}
