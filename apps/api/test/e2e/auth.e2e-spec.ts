import type { INestApplication } from '@nestjs/common';
import type { UserGender, UserRole } from '@repo/db/prisma/client';
import type { App } from 'supertest/types';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { COOKIE_NAMES } from '../../src/common/constants/cookie-config';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

type DbUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  dateOfBirth: Date;
  gender: UserGender;
  role: UserRole;
  createdAt: Date;
};

type UserSelect = {
  passwordHash?: boolean;
};

type UserWhere = {
  email?: string;
  id?: string;
};

type AuthResponseBody = {
  email: string;
  name?: string;
  passwordHash?: string;
  role: string;
};

type ProfileResponseBody = {
  user: AuthResponseBody;
};

class DuplicateEmailError extends Error {
  code = 'P2002';
}

const toSelectedUser = (user: DbUser, select: UserSelect) => {
  const { passwordHash, ...profile } = user;

  if (select.passwordHash) {
    return { ...profile, passwordHash };
  }

  return profile;
};

describe('Auth flows (e2e)', () => {
  let app: INestApplication<App>;
  let refreshTokens: unknown[];
  let users: DbUser[];

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-with-enough-entropy';
    process.env.JWT_REFRESH_TOKEN_HASH_SECRET = 'test-refresh-token-hash-secret';
  });

  beforeEach(async () => {
    refreshTokens = [];
    users = [];

    const prisma = {
      refreshToken: {
        create: jest.fn((args: { data: unknown }) => {
          const token = {
            ...(args.data as object),
            id: `refresh-token-${refreshTokens.length + 1}`,
          };
          refreshTokens.push(token);

          return Promise.resolve(token);
        }),
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
        findFirst: jest.fn(() => Promise.resolve(refreshTokens[0] ?? null)),
      },
      user: {
        create: jest.fn((args: { data: Omit<DbUser, 'createdAt' | 'id'>; select: UserSelect }) => {
          if (users.some((user) => user.email === args.data.email)) {
            throw new DuplicateEmailError('Duplicate email.');
          }

          const user: DbUser = {
            ...args.data,
            id: 'c6c792a0-dff7-48fc-a853-2e5cc850bd0a',
            createdAt: new Date('2026-05-12T00:00:00Z'),
          };
          users.push(user);

          return Promise.resolve(toSelectedUser(user, args.select));
        }),
        findMany: jest.fn((args: { select: UserSelect }) =>
          Promise.resolve(users.map((user) => toSelectedUser(user, args.select))),
        ),
        findUnique: jest.fn((args: { where: UserWhere; select: UserSelect }) => {
          const user = users.find(
            (candidate) => candidate.email === args.where.email || candidate.id === args.where.id,
          );

          return Promise.resolve(user ? toSelectedUser(user, args.select) : null);
        }),
      },
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers, logs in, reads profile, and logs out using httpOnly cookies', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'USER@example.com',
        password: 'Password1',
        name: 'Test User',
        dateOfBirth: '1998-01-02',
        gender: 'OTHER',
      })
      .expect(201);

    const registerBody = registerResponse.body as AuthResponseBody;

    expect(registerResponse.headers['set-cookie']).toBeUndefined();
    expect(registerBody).toMatchObject({
      email: 'user@example.com',
      name: 'Test User',
      role: 'CUSTOMER',
    });
    expect(registerBody).not.toHaveProperty('passwordHash');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password1' })
      .expect(200)
      .expect(({ headers }) => {
        const loginCookie = headers['set-cookie'] as string[];
        expect(loginCookie[0]).toContain(`${COOKIE_NAMES.ACCESS_TOKEN}=`);
        expect(loginCookie[0]).toContain('HttpOnly');
        expect(loginCookie[1]).toContain(`${COOKIE_NAMES.REFRESH_TOKEN}=`);
        expect(loginCookie[1]).toContain('HttpOnly');
      });

    const loginCookie = loginResponse.headers['set-cookie'] as string[];

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', loginCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as ProfileResponseBody;

        expect(body.user).toMatchObject({
          email: 'user@example.com',
          role: 'CUSTOMER',
        });
      });

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', loginCookie)
      .expect(200)
      .expect(({ headers }) => {
        const refreshCookie = headers['set-cookie'] as string[];
        expect(refreshCookie[0]).toContain(`${COOKIE_NAMES.ACCESS_TOKEN}=`);
        expect(refreshCookie[0]).toContain('HttpOnly');
        expect(refreshCookie[1]).toContain(`${COOKIE_NAMES.REFRESH_TOKEN}=`);
        expect(refreshCookie[1]).toContain('HttpOnly');
      });

    const refreshedCookie = refreshResponse.headers['set-cookie'] as string[];

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshedCookie)
      .expect(200)
      .expect(({ headers }) => {
        const logoutCookie = headers['set-cookie'] as string[];
        expect(logoutCookie[0]).toContain(`${COOKIE_NAMES.ACCESS_TOKEN}=;`);
      });
  });

  it('protects admin-only endpoints from customer users', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'customer@example.com',
        password: 'Password1',
        name: 'Customer User',
        dateOfBirth: '1998-01-02',
        gender: 'OTHER',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'customer@example.com', password: 'Password1' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Cookie', loginResponse.headers['set-cookie'] as string[])
      .expect(403);
  });
});
