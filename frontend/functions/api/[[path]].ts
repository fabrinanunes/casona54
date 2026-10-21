interface PagesEnvironment {
  API_ORIGIN: string;
}

export async function onRequest({
  request,
  env,
}: {
  request: Request;
  env: PagesEnvironment;
}): Promise<Response> {
  if (!env.API_ORIGIN) {
    return new Response("API_ORIGIN is not configured", { status: 500 });
  }

  const incomingURL = new URL(request.url);
  const upstreamURL = new URL(env.API_ORIGIN);
  upstreamURL.pathname =
    incomingURL.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  upstreamURL.search = incomingURL.search;

  return fetch(new Request(upstreamURL, request));
}
