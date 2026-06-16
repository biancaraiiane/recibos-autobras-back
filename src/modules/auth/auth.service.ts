import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import type { RegisterInput, LoginInput } from './auth.schema';
import type { JwtPayload } from '../../shared/types';

export async function registerUser(data: RegisterInput) {
  const { data: existing } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', data.email)
    .maybeSingle();

  if (existing) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const senha_hash = await bcrypt.hash(data.senha, 12);

  const { data: user, error } = await supabase
    .from('usuarios')
    .insert({ nome: data.nome, email: data.email, senha_hash, cargo: data.cargo })
    .select('id, nome, email, cargo, ativo, criado_em')
    .single();

  if (error || !user) {
    throw new AppError('Erro ao criar usuário', 500);
  }

  return user;
}

export async function loginUser(data: LoginInput) {
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, cargo, ativo, senha_hash')
    .eq('email', data.email)
    .maybeSingle();

  if (error || !user) {
    throw new AppError('Credenciais inválidas', 401);
  }

  if (!user.ativo) {
    throw new AppError('Usuário inativo', 403);
  }

  const senhaValida = await bcrypt.compare(data.senha, user.senha_hash);
  if (!senhaValida) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    nome: user.nome,
    cargo: user.cargo ?? undefined,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

  return {
    token,
    user: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo },
  };
}

export async function getMe(userId: string) {
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, cargo, ativo, criado_em')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  return user;
}
