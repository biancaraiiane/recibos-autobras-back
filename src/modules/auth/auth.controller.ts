import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from './auth.schema';
import { registerUser, loginUser, getMe } from './auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);
    res.status(201).json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getMe(req.user!.sub);
    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}
