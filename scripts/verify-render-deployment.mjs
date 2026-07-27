const apiUrl = process.env.API_URL?.trim().replace(/\/+$/, '');
const adminOrigin = process.env.ADMIN_ORIGIN?.trim().replace(/\/+$/, '');

if (!apiUrl) {
  console.error('API_URL is required.');
  process.exit(1);
}

const request = async (path, init) => {
  const response = await fetch(`${apiUrl}${path}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    ...init,
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response;
};

await request('/health/live');
await request('/health/ready');

if (adminOrigin) {
  const response = await request('/health/live', {
    method: 'OPTIONS',
    headers: {
      Origin: adminOrigin,
      'Access-Control-Request-Method': 'GET',
    },
  });
  const allowedOrigin = response.headers.get('access-control-allow-origin');
  const credentials = response.headers.get('access-control-allow-credentials');

  if (allowedOrigin !== adminOrigin || credentials !== 'true') {
    throw new Error(
      `CORS contract mismatch: origin=${allowedOrigin}, credentials=${credentials}`,
    );
  }
}

console.log(
  `Render deployment verified: live, ready${adminOrigin ? ', CORS' : ''}.`,
);
