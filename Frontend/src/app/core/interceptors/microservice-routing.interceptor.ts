// src/app/core/interceptors/microservice-routing.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ServiceRegistryService } from '../services/service-registry.service';

/**
 * Routes ms://<serviceId>/path requests.
 *
 * When a service has useLocal=true and a localPort configured, the ServiceRegistry
 * returns baseUrl = http://localhost:<port> — this is the direct-to-service path
 * used in IIS dev and production.
 *
 * When no local override is configured (useLocal=false), the registry returns the
 * liveUrl (e.g. http://devhub-userservice:3001) which is used in Docker / server
 * deployments.
 *
 * For ng serve development without any registry config, we fall back to the
 * Angular proxy path (/proxy/<serviceId>) so the dev server can forward the request
 * without CORS issues. This is the key fix for the CORS error seen in the console.
 */
export const microserviceRoutingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const registry = inject(ServiceRegistryService);

  if (req.url.startsWith('ms://')) {
    const withoutScheme = req.url.slice('ms://'.length);
    const slashIdx = withoutScheme.indexOf('/');
    const serviceId = slashIdx === -1 ? withoutScheme : withoutScheme.slice(0, slashIdx);
    const apiPath   = slashIdx === -1 ? '' : withoutScheme.slice(slashIdx);

    const resolved = registry.resolveUrl(serviceId);

    let targetUrl: string;

    if (resolved?.isLocal && resolved.baseUrl.startsWith('http://localhost')) {
      // Local dev with explicit port configured in registry — direct call, no CORS issue
      // because both Angular dev server and service are on localhost
      targetUrl = `${resolved.baseUrl}${apiPath}`;
    } else if (resolved && !resolved.baseUrl.startsWith('http://localhost')) {
      // Live / Docker URL — direct call (same network, no CORS)
      targetUrl = `${resolved.baseUrl}${apiPath}`;
    } else {
      // No registry config / default state — use Angular dev-server proxy
      // proxy.conf.json routes /proxy/<serviceId>/* → http://localhost:<port>
      targetUrl = `/proxy/${serviceId}${apiPath}`;
    }

    return next(req.clone({ url: targetUrl }));
  }

  // Pass-through for relative /api/* paths against registered apiPaths
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    for (const svc of registry.services()) {
      if (!svc.apiPath || !req.url.startsWith(svc.apiPath)) continue;
      const resolved = registry.resolveUrl(svc.id);
      if (!resolved) continue;
      return next(req.clone({ url: `${resolved.baseUrl}${req.url}` }));
    }
  }

  return next(req);
};