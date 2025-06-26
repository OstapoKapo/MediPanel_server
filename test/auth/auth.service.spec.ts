import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { mockUser } from '../mocks/index';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;


  interface ILoginDto {
    email: string;
    password: string;
  }

  const dto: ILoginDto = {
    email: 'test@example.com',
    password: 'plainPassword', 
  };


  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn()
            }
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          }
        }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('generateToken', () => {
    it('should generate token for user', async () => {
      (jwtService.signAsync as jest.Mock).mockResolvedValue('mockedToken');

      const token = await service.generateToken(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
      expect(token).toBe('mockedToken');
    });
    it('should throw an error if token generation fails', async () => {
      (jwtService.signAsync as jest.Mock).mockRejectedValue(new Error('An error occurred while generating token'));

      await expect(service.generateToken(mockUser)).rejects.toThrow(InternalServerErrorException);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('loginUser', () => {
    it('should log in user with valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);

      const user = await service.loginUser(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email }
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password + process.env.USER_PEPER, mockUser.password);
      expect(user).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestExpection if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const promise = service.loginUser(dto);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Some of the fields are incorrect');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestExpection if password in invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(false);

      const promise = service.loginUser(dto);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('Some of the fields are incorrect');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: dto.email}
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password + process.env.USER_PEPER, mockUser.password);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException if in Darabase an error occurs', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Datavase eror'));

      const promise = service.loginUser(dto);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toThrow('An error occurred while logging in');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException if bcrypt compare fails', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      const promise = service.loginUser(dto);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toThrow('An error occurred while logging in');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });
  });
});
