import type { INestApplication } from '@nestjs/common';
import type { UserGender, UserRole } from '@repo/db/prisma/client';
import type { App } from 'supertest/types';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AUTH_COOKIE_NAME } from '../../src/common/constants/auth.constants';
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
  user: {
    email: string;
    name?: string;
    passwordHash?: string;
    role: string;
  };
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
  let users: DbUser[];

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
  });

  beforeEach(async () => {
    users = [];

    const prisma = {
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

  it('registers, reads profile, logs in, and logs out using an httpOnly cookie', async () => {
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

    const registerCookie = registerResponse.headers['set-cookie'] as string[];
    const registerBody = registerResponse.body as AuthResponseBody;

    expect(registerCookie[0]).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(registerCookie[0]).toContain('HttpOnly');
    expect(registerBody.user).toMatchObject({
      email: 'user@example.com',
      name: 'Test User',
      role: 'CUSTOMER',
    });
    expect(registerBody.user).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', registerCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as AuthResponseBody;

        expect(body.user).toMatchObject({
          email: 'user@example.com',
          role: 'CUSTOMER',
        });
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password1' })
      .expect(201)
      .expect(({ headers }) => {
        const loginCookie = headers['set-cookie'] as string[];
        expect(loginCookie[0]).toContain(`${AUTH_COOKIE_NAME}=`);
        expect(loginCookie[0]).toContain('HttpOnly');
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(201)
      .expect(({ headers }) => {
        const logoutCookie = headers['set-cookie'] as string[];
        expect(logoutCookie[0]).toContain(`${AUTH_COOKIE_NAME}=;`);
      });
  });

  it('protects admin-only endpoints from customer users', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'customer@example.com',
        password: 'Password1',
        name: 'Customer User',
        dateOfBirth: '1998-01-02',
        gender: 'OTHER',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Cookie', registerResponse.headers['set-cookie'] as string[])
      .expect(403);
  });
});
