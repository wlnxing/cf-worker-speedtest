import down from './down.js';
import up from './up.js';

export default {
	async fetch(req: Request, env: any, ctx: ExecutionContext) {
		let url = new URL(req.url);
		let path = url.pathname.replace(/[/]$/, '');

		if (path.includes('/down')) {
			return down(req, env, ctx);
		} else if (path.includes('/up')) {
			return up(req);
		} else {
			return new Response('Not found', { status: 404 });
		}
	},
};
