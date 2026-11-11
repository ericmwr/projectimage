// =====================================================================
// Only answer this PC's own Callout Studio page.
//
// Host check: a request must be addressed to localhost:<port> or
// 127.0.0.1:<port>. This stops a website from using a look-alike web
// address that points back at this PC ("DNS rebinding") to reach the jobs.
//
// Origin check: when a browser says which page a request came from (the
// Origin header), it must be Callout Studio itself. This stops any other
// website open in the browser from reading or changing jobs.
// Requests with no Origin header (typing the address, loading a photo)
// are fine as long as the Host is right.
// =====================================================================
import type { RequestHandler } from "express";

export const allowedHosts = (port: number) => [`localhost:${port}`, `127.0.0.1:${port}`];

export const isAllowedRequest = (
  host: string | undefined,
  origin: string | undefined,
  port: number,
): boolean => {
  const hosts = allowedHosts(port);
  if (!host || !hosts.includes(host.toLowerCase())) return false;
  if (origin !== undefined && !hosts.map((h) => `http://${h}`).includes(origin.toLowerCase())) {
    return false;
  }
  return true;
};

export const localOnly =
  (port: number): RequestHandler =>
  (req, res, next) => {
    if (isAllowedRequest(req.headers.host, req.headers.origin, port)) {
      next();
      return;
    }
    res.status(403).type("text/plain").send("Callout Studio only answers its own page on this PC.");
  };
