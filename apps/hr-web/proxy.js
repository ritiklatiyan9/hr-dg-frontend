import { next } from "@vercel/functions";

const backend = new URL("https://hr-dg-backend.onrender.com");
const apiRoots = new Set([
  "analytics",
  "auth",
  "dwr",
  "files",
  "graphql",
  "health",
  "payroll",
  "profile",
]);

export default async function proxy(request) {
  const incoming = new URL(request.url);
  if (!apiRoots.has(incoming.pathname.split("/")[1])) return next();

  const origin = request.headers.get("origin");
  if (origin && origin !== incoming.origin)
    return new Response("Origin not permitted", { status: 403 });
  if (!origin && !["GET", "HEAD"].includes(request.method))
    return new Response("Origin required", { status: 403 });

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  if (origin) headers.set("origin", backend.origin);

  const target = new URL(incoming.pathname + incoming.search, backend);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      duplex: "half",
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("HR upstream unavailable", {
      name: error instanceof Error ? error.name : "Unknown",
      code: error?.cause?.code ?? undefined,
    });
    return Response.json(
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: "The HR service is temporarily unavailable. Try again.",
      },
      {
        status: 502,
        headers: { "cache-control": "no-store", "retry-after": "3" },
      },
    );
  }
}
