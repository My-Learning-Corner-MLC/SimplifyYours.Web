import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

if (!environment.apiBaseUrl) {
  throw new Error(
    'API gateway URL is not configured. Set apiBaseUrl in the active environment file before building.',
  );
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
