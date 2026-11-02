import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Timestamp trigger: 2026-10-29T09:33:00
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

