import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import type { RegisterInput, LoginInput } from './auth.schema';
import type { JwtPayload } from '../../shared/types';

export async function registerUser(data: RegisterInput) {
  const email = data.email.trim().toLowerCase();

  const { data: existing, error: existingError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  console.log('[REGISTER DEBUG] existing user check:', {
    emailRecebido: data.email,
    emailNormalizado: email,
    encontrouUsuarioExistente: !!existing,
    existingError,
  });

  if (existingError) {
    console.log('[REGISTER ERROR] existingError:', existingError);

    throw new AppError(
      existingError.message || 'Erro ao verificar usuário existente',
      500
    );
  }

  if (existing) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const senha_hash = await bcrypt.hash(data.senha, 12);

  const { data: user, error } = await supabase
    .from('usuarios')
    .insert({
      nome: data.nome,
      email,
      senha_hash,
      cargo: data.cargo ?? null,
      ativo: true,
    })
    .select('id, nome, email, cargo, ativo, criado_em')
    .single();

  console.log('[REGISTER DEBUG] insert result:', {
    criouUsuario: !!user,
    user,
    error,
  });

  if (error || !user) {
    console.log('[REGISTER ERROR] insert error:', error);

    throw new AppError(
      error?.message || 'Erro ao criar usuário',
      500
    );
  }

  return user;
}

export async function loginUser(data: LoginInput) {
  const email = data.email.trim().toLowerCase();

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, cargo, ativo, senha_hash')
    .eq('email', email)
    .maybeSingle();

  console.log('[LOGIN DEBUG] user query:', {
    emailRecebido: data.email,
    emailNormalizado: email,
    encontrouUsuario: !!user,
    supabaseError: error,
    ativo: user?.ativo,
    hashExiste: !!user?.senha_hash,
    hashPrefix: user?.senha_hash?.slice(0, 7),
    hashLength: user?.senha_hash?.length,
  });

  if (error) {
    console.log('[LOGIN ERROR] Supabase error:', error);

    throw new AppError(
      error.message || 'Erro ao buscar usuário',
      500
    );
  }

  if (!user) {
    throw new AppError('Credenciais inválidas', 401);
  }

  if (!user.ativo) {
    throw new AppError('Usuário inativo', 403);
  }

  if (!user.senha_hash) {
    console.log('[LOGIN ERROR] senha_hash vazio ou inexistente:', {
      email,
      userId: user.id,
    });

    throw new AppError('Credenciais inválidas', 401);
  }

  const senhaValida = await bcrypt.compare(data.senha, user.senha_hash);

  console.log('[LOGIN DEBUG] password compare:', {
    email,
    senhaValida,
  });

  if (!senhaValida) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    nome: user.nome,
    cargo: user.cargo ?? undefined,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
    },
  };
}

export async function getMe(userId: string) {
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, cargo, ativo, criado_em')
    .eq('id', userId)
    .single();

  console.log('[ME DEBUG]', {
    userId,
    encontrouUsuario: !!user,
    error,
  });

  if (error || !user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  return user;
}