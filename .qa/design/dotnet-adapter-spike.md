# Design: .NET adapter spike

Issue #47. New `packages/adapter-dotnet`. Do not change core schemas.

Detect `.csproj` / `.sln` at the project root. Skip Unity (`ProjectSettings/ProjectVersion.txt`). Doctor locates `dotnet` via env/PATH. Collector reads `potato.dotnet-counters.json` or marks `dotnet.counters` unsupported.
