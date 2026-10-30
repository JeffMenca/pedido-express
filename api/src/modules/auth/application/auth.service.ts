import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import { AuthenticatedUser } from '../domain/authenticated-user';
import { UserEntity } from '../infrastructure/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const user = await this.users.findOneBy({
      username: username.trim().toLowerCase(),
    });
    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!user || !valid)
      throw new DomainError(
        'INVALID_CREDENTIALS',
        'Invalid username or password',
      );
    const principal: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        username: user.username,
        role: user.role,
      }),
      user: principal,
    };
  }
}
