import { protocol } from "electron";
import { createMediaResponse } from "./media-response.mjs";
import { PIXORES_MEDIA_SCHEME } from "./media-url.mjs";

export function registerMediaSchemeAsPrivileged() {
  protocol.registerSchemesAsPrivileged([{
    scheme: PIXORES_MEDIA_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  }]);
}

export function registerMediaProtocol() {
  protocol.handle(PIXORES_MEDIA_SCHEME, async (request) => {
    try {
      if (process.env.PIXORES_MEDIA_DEBUG === "1") console.log(`[pixores-media] ${request.method} ${request.url}`);
      return await createMediaResponse(request);
    } catch (error) {
      console.error("[pixores-media]", error);
      return new Response("Pixores media file could not be opened.", {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  });
}
