import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ErrorResponseDto } from '../../../common/errors/error-response.dto';
import { AuthService } from '../application/auth.service';

class LoginDto {
  @ApiProperty({ example: 'cajero' })
  @IsString()
  @IsNotEmpty()
  username: string;
  @ApiProperty({ example: 'PedidoExpress2026' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({
    description: '{ accessToken, user: { id, username, role } }',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'INVALID_CREDENTIALS',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }
}
