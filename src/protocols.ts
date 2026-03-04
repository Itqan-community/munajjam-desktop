import { protocol, net } from "electron";
import path from "path";
import fs from "fs";
import { uiOutDir } from "./paths";
import { isPathApproved } from "./approved-paths";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};

export function isWithin(base: string, target: string): boolean {
  const rel = path.relative(path.resolve(base), path.resolve(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function toSafeAppFilePath(outDir: string, requestPathname: string): string {
  const stripped = requestPathname.replace(/^\/+/, "");
  if (!stripped || stripped === "/") {
    return path.join(outDir, "en.html");
  }

  const requested = path.join(outDir, stripped);
  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    return requested;
  }

  const htmlCandidate = path.join(outDir, `${stripped}.html`);
  if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
    return htmlCandidate;
  }

  return requested;
}

export const registerAppProtocol = () => {
  const outDir = uiOutDir();

  protocol.handle("munajjam-app", (request) => {
    try {
      const url = new URL(request.url);
      const filePath = toSafeAppFilePath(outDir, decodeURIComponent(url.pathname));

      if (!isWithin(outDir, filePath)) {
        return new Response("Forbidden", { status: 403 });
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new Response("Not Found", { status: 404 });
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";

      return net.fetch(`file://${filePath}`, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return new Response("Internal error", { status: 500 });
    }
  });
};

export const registerMediaProtocol = () => {
  protocol.handle("munajjam", (request) => {
    try {
      const url = new URL(request.url);
      const rawPath = url.searchParams.get("path");
      if (!rawPath) {
        return new Response("Missing path parameter", { status: 400 });
      }

      const resolved = path.resolve(decodeURIComponent(rawPath));
      if (!isPathApproved(resolved)) {
        return new Response("Forbidden", { status: 403 });
      }
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        return new Response("Not Found", { status: 404 });
      }

      return net.fetch(`file://${resolved}`);
    } catch {
      return new Response("Internal error", { status: 500 });
    }
  });
};
