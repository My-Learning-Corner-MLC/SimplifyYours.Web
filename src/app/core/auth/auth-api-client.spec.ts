import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthApiClient } from './auth-api-client';
import { SignUpError } from './sign-up-error.model';
import { SignUpRequest } from './sign-up-request.model';
import { SignUpResponse } from './sign-up-response.model';

describe('AuthApiClient', () => {
  let client: AuthApiClient;
  let httpMock: HttpTestingController;
  const url = `${environment.identityBaseUrl}/auth/sign-up`;

  const validRequest = (): SignUpRequest => ({
    fullName: 'Eleanor Whitmore',
    email: 'eleanor@whitmore.studio',
    password: 'Sup3rSecret!',
    confirmPassword: 'Sup3rSecret!',
    acceptTermsAndPrivacy: true,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(AuthApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs the request body to /auth/sign-up', () => {
    const body = validRequest();
    client.signUp(body).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBe(false);
    req.flush({
      userId: 'u1',
      email: body.email,
      fullName: body.fullName,
      role: 'User',
      status: 'Active',
    });
  });

  it('returns the SignUpResponse on 201', () => {
    const expected: SignUpResponse = {
      userId: 'u1',
      email: 'eleanor@whitmore.studio',
      fullName: 'Eleanor Whitmore',
      role: 'User',
      status: 'Active',
    };
    let actual: SignUpResponse | undefined;
    client.signUp(validRequest()).subscribe((r) => (actual = r));
    httpMock.expectOne(url).flush(expected, { status: 201, statusText: 'Created' });
    expect(actual).toEqual(expected);
  });

  it('maps a 400 with a single field error to camelCase fieldErrors', () => {
    let err: SignUpError | undefined;
    client.signUp(validRequest()).subscribe({ error: (e) => (err = e as SignUpError) });

    httpMock.expectOne(url).flush(
      { errors: { Email: ["That doesn't look like a valid email."] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(err).toEqual({
      fieldErrors: { email: ["That doesn't look like a valid email."] },
    });
  });

  it('maps a 400 with multiple field errors', () => {
    let err: SignUpError | undefined;
    client.signUp(validRequest()).subscribe({ error: (e) => (err = e as SignUpError) });

    httpMock.expectOne(url).flush(
      {
        errors: {
          FullName: ['Please tell us what to call you.'],
          Email: ["That doesn't look like a valid email."],
          Password: ['Use at least 8 characters.'],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(err?.fieldErrors).toEqual({
      fullName: ['Please tell us what to call you.'],
      email: ["That doesn't look like a valid email."],
      password: ['Use at least 8 characters.'],
    });
    expect(err?.pageError).toBeUndefined();
  });

  it('maps an "email already in use" 400 to fieldErrors.email', () => {
    let err: SignUpError | undefined;
    client.signUp(validRequest()).subscribe({ error: (e) => (err = e as SignUpError) });

    httpMock.expectOne(url).flush(
      { errors: { Email: ['An account with this email address already exists.'] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(err?.fieldErrors).toEqual({
      email: ['An account with this email address already exists.'],
    });
  });

  it('maps 5xx responses to pageError with the generic message', () => {
    let err: SignUpError | undefined;
    client.signUp(validRequest()).subscribe({ error: (e) => (err = e as SignUpError) });

    httpMock
      .expectOne(url)
      .flush({ title: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(err?.fieldErrors).toEqual({});
    expect(err?.pageError).toMatch(/something went wrong/i);
  });

  it('maps a network failure to pageError', () => {
    let err: SignUpError | undefined;
    client.signUp(validRequest()).subscribe({ error: (e) => (err = e as SignUpError) });

    httpMock.expectOne(url).error(new ProgressEvent('error'));

    expect(err?.fieldErrors).toEqual({});
    expect(err?.pageError).toMatch(/something went wrong/i);
  });

  it('falls back to pageError when 400 body has no usable errors map', () => {
    let err: SignUpError | undefined;
    client.signUp(validRequest()).subscribe({ error: (e) => (err = e as SignUpError) });

    httpMock
      .expectOne(url)
      .flush({ title: 'Bad request' }, { status: 400, statusText: 'Bad Request' });

    expect(err?.fieldErrors).toEqual({});
    expect(err?.pageError).toMatch(/something went wrong/i);
  });
});
