import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from '../src/services/user.service';
import { OAuth2Client } from 'google-auth-library';

jest.mock('axios');

describe('UserService social login helpers', () => {
  afterEach(() => jest.resetAllMocks());

  test('verifyGoogleIdToken returns payload for a valid token', async () => {
    const payload = { email: 'test@example.com', email_verified: true, name: 'Test User', picture: 'http://img', sub: 'google-sub', aud: 'test-client' };
    (OAuth2Client.prototype as any).verifyIdToken = jest.fn().mockResolvedValue({ getPayload: () => payload });
    const idToken = 'fake-google-token';
    // set env.googleClientId to match
    process.env.GOOGLE_CLIENT_ID = 'test-client';
    const result: any = await (UserService as any).verifyGoogleIdToken(idToken);
    expect(result.email).toBe('test@example.com');
    expect(result.sub).toBe('google-sub');
  });

  test('loginWithGoogle upserts user and returns it', async () => {
    const payload = { email: 'test2@example.com', email_verified: true, name: 'Test2', picture: 'http://img', sub: 'google-sub-2' };
    (OAuth2Client.prototype as any).verifyIdToken = jest.fn().mockResolvedValue({ getPayload: () => payload });

    // mock mongoose findOneAndUpdate via the model used in the service
    const mockUser = { _id: '123', email: 'test2@example.com', name: 'Test2' } as any;
    const UserModel = require('../src/models/user.model');
    UserModel.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockUser);

    const user = await (UserService as any).loginWithGoogle('fake');
    expect(user.email).toBe('test2@example.com');
  });

  test('verifyAppleIdToken uses JWKS and jwt.verify', async () => {
    // mock axios to return jwks
    const jwk = { kty: 'RSA', kid: 'kid1', alg: 'RS256', n: 'testn', e: 'AQAB' };
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { keys: [jwk] } });

    // mock jwt.decode to include header
    jest.spyOn(jwt, 'decode').mockReturnValueOnce({ header: { kid: 'kid1', alg: 'RS256' } } as any);
    const expectedPayload = { sub: 'apple-sub', email: 'apple@example.com' };
    jest.spyOn(jwt, 'verify').mockReturnValueOnce(expectedPayload as any);

    // mock crypto.createPublicKey to return an object with export
    (crypto as any).createPublicKey = jest.fn(() => ({ export: jest.fn(() => 'pem') }));

    const payload: any = await (UserService as any).verifyAppleIdToken('fake-apple-token');
    expect(payload.email).toBe('apple@example.com');
  });
});
