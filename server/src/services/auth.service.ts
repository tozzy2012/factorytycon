import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { config } from '../config';
import { UsersRepository } from '../repositories/users.repository';
import { TokensRepository } from '../repositories/tokens.repository';
import type { AuthPayload } from '../types';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthService {
  constructor(
    private usersRepo: UsersRepository,
    private tokensRepo: TokensRepository,
  ) {}

  async register(username: string, email: string, password: string) {
    // Uniqueness check
    const existingEmail = await this.usersRepo.findByEmail(email);
    if (existingEmail) throw new AppError(409, 'Email já cadastrado.');

    const existingUsername = await this.usersRepo.findByUsername(username);
    if (existingUsername) throw new AppError(409, 'Username já em uso.');

    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const user = await this.usersRepo.create({ username, email, passwordHash });

    return this.#issueTokens(user.id, user.username, user.role);
  }

  async login(emailOrUsername: string, password: string) {
    const user = emailOrUsername.includes('@')
      ? await this.usersRepo.findByEmail(emailOrUsername)
      : await this.usersRepo.findByUsername(emailOrUsername);

    if (!user) throw new AppError(401, 'Credenciais inválidas.');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Credenciais inválidas.');

    return this.#issueTokens(user.id, user.username, user.role);
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokensRepo.verify(refreshToken);
    if (!payload) throw new AppError(401, 'Refresh token inválido ou expirado.');

    const user = await this.usersRepo.findById(payload.userId);
    if (!user) throw new AppError(401, 'Usuário não encontrado.');

    // Rotate: revoke old, issue new
    await this.tokensRepo.revoke(refreshToken);
    return this.#issueTokens(user.id, user.username, user.role);
  }

  async logout(refreshToken: string) {
    await this.tokensRepo.revoke(refreshToken);
  }

  async logoutAll(userId: number) {
    await this.tokensRepo.revokeAllForUser(userId);
  }

  async me(userId: number) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new AppError(404, 'Usuário não encontrado.');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async #issueTokens(userId: number, username: string, role: string) {
    const payload: AuthPayload = { sub: userId, username, role };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.REFRESH_TOKEN_EXPIRES_DAYS);
    await this.tokensRepo.store(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }
}
