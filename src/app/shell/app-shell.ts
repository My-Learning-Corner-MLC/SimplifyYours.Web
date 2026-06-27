import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { SiteHeader } from './site-header/site-header';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SiteHeader, Toast],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {}
