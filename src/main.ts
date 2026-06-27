import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

if (!environment.identityBaseUrl || !environment.identityWebUrl) {
  throw new Error(
    'Identity URLs are not configured. Set identityBaseUrl and identityWebUrl in the active environment file before building.',
  );
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
