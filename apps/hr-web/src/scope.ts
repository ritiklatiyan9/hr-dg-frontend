// Each mounted tab owns one instance. No process-global or shared-storage site.
export class ScopeBoundary {
  private generation = 0;
  private controllers = new Set<AbortController>();
  change() {
    this.generation++;
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
  }
  ticket() {
    const generation = this.generation;
    const controller = new AbortController();
    this.controllers.add(controller);
    return {
      signal: controller.signal,
      isCurrent: () => generation === this.generation,
      release: () => this.controllers.delete(controller),
    };
  }
}
export const scopeKey = (
  organizationId: string,
  actorId: string,
  permissionVersion: number,
  siteId: string,
) => ["scope", organizationId, actorId, permissionVersion, siteId] as const;
