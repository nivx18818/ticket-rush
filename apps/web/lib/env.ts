import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .url('NEXT_PUBLIC_API_BASE_URL must be an absolute URL.')
    .min(1, 'NEXT_PUBLIC_API_BASE_URL is required.')
    .transform((value) => value.replace(/\/+$/, '')),
});

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsedPublicEnv.success) {
  throw new Error(z.prettifyError(parsedPublicEnv.error));
}

export const publicEnv = parsedPublicEnv.data;
