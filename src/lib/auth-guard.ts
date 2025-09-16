export function assertAdmin(req: Request) {
  if (process.env.NODE_ENV === 'development') return; // allow all in dev
  const want = process.env.ADMIN_SECRET;
  if (!want) return;
  const got = req.headers.get('x-admin-secret') || '';
  if (got !== want) {
    const err = new Error('Forbidden');
    // @ts-expect-error: Error object does not have a 'status' property by default
    err.status = 403;
    throw err;
  }
}
