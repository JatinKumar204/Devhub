// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withViewTransitions,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { microserviceRoutingInterceptor } from './core/interceptors/microservice-routing.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions(),
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),
    provideHttpClient(
      withInterceptors([authInterceptor, microserviceRoutingInterceptor])
    ),
    provideAnimations(),
  ]
};
