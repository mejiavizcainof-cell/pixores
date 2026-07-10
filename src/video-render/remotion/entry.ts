import { registerRoot } from "remotion";
import Root from "./Root";

/**
 * Remotion bundle entrypoint.
 *
 * Server rendering points @remotion/bundler here so the Pixores composition is
 * registered without coupling the Next.js frontend to Remotion internals.
 */

registerRoot(Root);
