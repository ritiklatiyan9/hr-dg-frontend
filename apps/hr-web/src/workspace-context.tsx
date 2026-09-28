import { toast } from "sonner";
import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentNode } from "graphql";
import type { SiteScopeQuery } from "../../../packages/contracts/src/generated";
import { gql } from "./api";
import { ScopeBoundary } from "./scope";
export interface WorkspaceScope {
  sites: { id: string; name: string }[];
  siteId: string;
  siteName: string;
  workDate: string;
  actorId: string;
  version: number;
  key: readonly unknown[];
  capabilities: string[];
  modules: SiteScopeQuery["scope"]["modules"];
  decisions: SiteScopeQuery["scope"]["decisions"];
  boundary: ScopeBoundary;
  reload: () => void;
}
export const ScopeContext = createContext<WorkspaceScope | null>(null);
export const useScope = () => {
  const scope = useContext(ScopeContext);
  if (!scope) throw Error("Select a workspace");
  return scope;
};
export function useScopedQuery<T>(
  suffix: readonly unknown[],
  document: DocumentNode,
  variables: Record<string, unknown> = {},
  enabled = true,
  interval?: number,
) {
  const s = useScope();
  return useQuery({
    queryKey: [...s.key, ...suffix],
    enabled,
    queryFn: async ({ signal }) => {
      const ticket = s.boundary.ticket();
      try {
        const data = await gql<T>(
          document,
          { siteId: s.siteId, ...variables },
          AbortSignal.any([signal, ticket.signal]),
          s.version,
        );
        if (!ticket.isCurrent())
          throw new DOMException("Scope changed", "AbortError");
        return data;
      } finally {
        ticket.release();
      }
    },
    staleTime: suffix[0] === "foundation" ? 120_000 : 30_000,
    gcTime: 300_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: interval,
  });
}
export function useWrite() {
  const scope = useScope();
  const client = useQueryClient();
  return async <T,>(
    document: DocumentNode,
    variables: Record<string, unknown>,
  ): Promise<T> => {
    const t = scope.boundary.ticket();
    try {
      const data = await gql<T>(
        document,
        { siteId: scope.siteId, ...variables },
        undefined,
        scope.version,
      );
      if (!t.isCurrent())
        throw new Error(
          "The original workspace changed. Reload that site to confirm the result.",
        );
      // A private upload reservation changes no displayed business data. Avoid
      // refetching the entire workspace before the photo can even upload.
      if (variables.operation !== "fileIntent")
        await client.invalidateQueries({ queryKey: scope.key });
      const definition = document.definitions.find(
        (d) => d.kind === "OperationDefinition",
      );
      const operationName =
        definition?.kind === "OperationDefinition"
          ? definition.name?.value
          : undefined;
      if (
        [
          "UpdateProfile",
          "SaveFoundation",
          "HrCommand",
          "PayrollCommand",
        ].includes(operationName ?? "")
      )
        toast.success("Changes saved.");
      return data;
    } finally {
      t.release();
    }
  };
}
