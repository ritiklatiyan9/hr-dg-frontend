import { print, type DocumentNode } from "graphql";
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}
export const isAccessFailure = (error: unknown) =>
  error instanceof ApiError &&
  ["UNAUTHENTICATED", "MFA_REQUIRED", "SCOPE_CHANGED", "FORBIDDEN"].includes(
    error.code,
  );
export const isTransientFailure = (error: unknown) =>
  error instanceof ApiError &&
  !isAccessFailure(error) &&
  ([
    "NETWORK_ERROR",
    "UPSTREAM_UNAVAILABLE",
    "INTERNAL_ERROR",
    "INTERNAL_SERVER_ERROR",
    "SERVICE_UNAVAILABLE",
  ].includes(error.code) ||
    (error.status !== undefined && error.status >= 500));
async function request(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (
      init.signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "The HR service is temporarily unreachable. Try again.",
    );
  }
}
async function responseJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "The HR service returned an unexpected response. Try again.",
      response.status,
    );
  }
}
const csrf = () =>
  decodeURIComponent(
    document.cookie
      .split("; ")
      .find((x) => x.startsWith("dg_csrf="))
      ?.split("=")
      .slice(1)
      .join("=") ?? "",
  );
export async function rest<T>(path: string, body?: unknown): Promise<T> {
  const r = await request(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-client": "web",
      "x-csrf-token": csrf(),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await responseJson(r);
  if (!r.ok)
    throw new ApiError(
      json.code ?? "NETWORK_ERROR",
      json.message ?? "Request failed",
      r.status,
    );
  return json;
}
export async function gql<T>(
  document: DocumentNode,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
  version?: number,
): Promise<T> {
  const r = await request("/graphql", {
    method: "POST",
    credentials: "same-origin",
    signal,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf(),
      ...(version === undefined
        ? {}
        : { "x-permission-version": String(version) }),
    },
    body: JSON.stringify({ query: print(document), variables }),
  });
  const json = await responseJson(r);
  if (!r.ok || json.errors?.length) {
    const code =
      json.errors?.[0]?.extensions?.code ?? json.code ?? "NETWORK_ERROR";
    if (
      version !== undefined &&
      (code === "SCOPE_CHANGED" ||
        code === "UNAUTHENTICATED" ||
        code === "MFA_REQUIRED")
    )
      window.dispatchEvent(new Event("dg:scope-changed"));
    throw new ApiError(
      code,
      json.errors?.[0]?.message ?? json.message ?? "Request failed",
      r.status,
    );
  }
  return json.data;
}
export async function uploadEvidence(siteId: string, id: string, file: Blob) {
  const response = await request(
    `/files/intents/${id}/content?siteId=${encodeURIComponent(siteId)}`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/octet-stream",
        "x-csrf-token": csrf(),
      },
      body: file,
    },
  );
  const result = await responseJson(response);
  if (!response.ok)
    throw new ApiError(
      result.code ?? "UPLOAD_FAILED",
      result.message ?? "Photo upload failed",
      response.status,
    );
  return result as { id: string; status: string; scanResult: string };
}
