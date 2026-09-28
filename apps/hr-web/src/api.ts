import { print, type DocumentNode } from "graphql";
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
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
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-client": "web",
      "x-csrf-token": csrf(),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await r.json();
  if (!r.ok)
    throw new ApiError(
      json.code ?? "NETWORK_ERROR",
      json.message ?? "Request failed",
    );
  return json;
}
export async function gql<T>(
  document: DocumentNode,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
  version?: number,
): Promise<T> {
  const r = await fetch("/graphql", {
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
  const json = await r.json();
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
    );
  }
  return json.data;
}
export async function uploadEvidence(siteId: string, id: string, file: Blob) {
  const response = await fetch(
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
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.code ?? "UPLOAD_FAILED",
      result.message ?? "Photo upload failed",
    );
  return result as { id: string; status: string; scanResult: string };
}
