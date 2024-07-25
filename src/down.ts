import { sleep } from './utils/sleep';

const MAX_MB = 1024;
const DEFAULT_NUM_MB = 10;

export default async function (request: Request, env: any, ctx: ExecutionContext) {
	const { searchParams: qs } = new URL(request.url);

	const value = qs.get('size'); // in MB

	let serverDelay: number | string = qs.get('sd') || 0;
	serverDelay = Number(serverDelay);
	if (isNaN(serverDelay)) {
		serverDelay = 0;
	}
	let upstreamDelay: number | string = qs.get('ud') || 0;
	upstreamDelay = Number(upstreamDelay);
	if (isNaN(upstreamDelay)) {
		upstreamDelay = 0;
	}
	upstreamDelay += serverDelay;

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

	const chunkSize = 1024 * 1024; // Chunk size in bytes
	let bytesRemaining = numBytes;
	const chunk = new Uint8Array(Math.min(chunkSize, bytesRemaining));

	let pushCount = 0;

	const stream = new ReadableStream({
		async start(controller) {
			while (bytesRemaining > 0) {
				if (pushCount == 0) {
					console.log(`start push, waiting ${upstreamDelay - serverDelay}ms`, bytesRemaining);
					await sleep(upstreamDelay);
				}
				pushCount++;

				if (controller.desiredSize === null) {
					console.log('desiredSize is null');
					// await sleep(1000);
					continue;
				}

				if (controller.desiredSize <= 0) {
					console.log('desiredSize is backpressure', controller.desiredSize, pushCount);
					await sleep(400);
					continue;
				}

				// 如果是最后一次，chunkSize 可能会大于 bytesRemaining
				if (chunk.length > bytesRemaining) {
					console.log('last chunk', bytesRemaining);
					controller.enqueue(new Uint8Array(bytesRemaining));
					controller.close();
				}
				// await sleep(1000);	// 模拟上游api网络延迟

				controller.enqueue(chunk);
				bytesRemaining -= chunk.length;
			}
			controller.close();
		},
	});

	const res = new Response(stream, resInit);

	console.log(`waiting ${serverDelay}ms to Response....`);
	await sleep(serverDelay);

	return res;
}
