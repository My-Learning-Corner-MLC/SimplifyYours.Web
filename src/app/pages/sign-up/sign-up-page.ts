import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-sign-up-page',
  templateUrl: './sign-up-page.html',
  styleUrl: './sign-up-page.scss',
})
export class SignUpPage {
  readonly identityWebUrl = 'https://identity.simplifyyours.com';
}
