/** Workspace smoke export — domain services land here in later issues. */
export const CORE_PACKAGE_NAME = "@potato-boost/core" as const;

export function workspaceReady(): true {
  return true;
}
