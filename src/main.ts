import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

if (!environment.identityBaseUrl) {
  throw new Error(
    'Identity URL is not configured. Set identityBaseUrl in the active environment file before building.',
  );
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
