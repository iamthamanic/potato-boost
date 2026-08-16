import type { Plugin } from "vite";

export function potatoDevSession(): Plugin {
  return {
    name: "potato-dev-session",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split("?")[0];
        if (path !== "/__potato/session") {
          next();
          return;
        }
        const token = process.env.POTATO_DEV_TOKEN;
        const api = process.env.POTATO_DEV_API;
        if (
          token === undefined ||
          token.length === 0 ||
          api === undefined ||
          api.length === 0
        ) {
          response.statusCode = 404;
          response.end();
          return;
        }
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ token, api }));
      });
    },
  };
}
