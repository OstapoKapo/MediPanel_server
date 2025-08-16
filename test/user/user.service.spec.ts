import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createUserDto, mockUser } from '../mocks/index';
import * as crypto from 'crypto';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            }
          }
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findUserByEmail', () => {
    it('should return a user by email', async () => {
      ((prisma.user.findUnique) as jest.Mock).mockResolvedValue(mockUser);

      const user = await service.findUserByEmail(mockUser.email);
      expect(user).toEqual(mockUser);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: mockUser.email}
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const promise = service.findUserByEmail(mockUser.email);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: mockUser.email}
      });

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('User not found');

    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DataBase error'));

      const promise = service.findUserByEmail(mockUser.email);

      await expect(promise).rejects.toThrow('An error occurred while finding user by email');
      await expect(promise).rejects.toThrow(InternalServerErrorException);

    });

  });

  describe('findUserById', () => {
    it('should retur a user by id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const user = await service.findUserById(mockUser.id);
      expect(user).toEqual(mockUser);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {id: mockUser.id}
      });
    });

    it('should throw BadRequestException if user mot found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const promise = service.findUserById(mockUser.id);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('User not found');
      
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DataBase error'));

      const promise = service.findUserById(mockUser.id);

      await expect(promise).rejects.toThrow('An error occurred while finding user by id');
      await expect(promise).rejects.toThrow(InternalServerErrorException);

    });
  });

  describe('createUser', () => {

  it('should create a new user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue('User created successfully');

    const password = await service.createUser(createUserDto);

    expect(typeof password).toBe('string');      
    expect(password.length).toBe(10);           


    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: createUserDto.email.toLowerCase(),
        password: expect.any(String),
        role: createUserDto.role,
        createdat: expect.any(Date),  // маленька літера, як у сервісі
        is2FA: false,
        isVerified: false,
        ip: 'unknown',               // значення з сервісу
        ua: 'unknown',
      },
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: createUserDto.email }
    });
  });

    it('should throw BadRequestException if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const promise = service.createUser(createUserDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: createUserDto.email}
      });

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('User with this email already exists');

    });

    it('should throw InternalServerErrorException on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      jest.spyOn(crypto, 'randomUUID').mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const promise = service.createUser(createUserDto);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toThrow('An error occurred while creating user');
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({id: 1});
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue('newHashedPassword');
      
      await expect(service.changePassword('newPassword', 1)).resolves.toBeUndefined();

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {id: 1},
        data: {
          password: expect.any(String),
        }
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword' + process.env.USER_PEPER, 10);
    });

    it('should throw BadRequestException if user not found', async () => {
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue('newHashedPassword');
      (prisma.user.update as jest.Mock).mockResolvedValue(null);

      const promise = service.changePassword('newPassword', mockUser.id);
      expect(promise).rejects.toThrow(BadRequestException);
      expect(promise).rejects.toThrow('User not found');
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue('newHashedPassword');
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const promise = service.changePassword('newPassword', mockUser.id);
      expect(promise).rejects.toThrow(InternalServerErrorException);
      expect(promise).rejects.toThrow('An error occurred while changing password');
    });
  });

  describe('changeIsVerified', () => {
    it('should change user isVerified status', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({id: 1});

      await expect(service.changeIsVerified(1)).resolves.toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {id: 1},
        data: {isVerified: true}
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(null);

      const promise = service.changeIsVerified(1);

      expect(promise).rejects.toThrow(BadRequestException);
      expect(promise).rejects.toThrow('User not found');
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const promise = service.changeIsVerified(1);

      expect(promise).rejects.toThrow(InternalServerErrorException);
      expect(promise).rejects.toThrow('An error occurred while verifying user');
    });

    describe('changeIPAndUA', () => {
      it('should change user IP and User Agent', async () => {
        (prisma.user.update as jest.Mock).mockResolvedValue({id: 1});

        await expect(service.changeIPAndUA(1, 'ipAdress', 'userAgent')).resolves.toBeUndefined();

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: {id: 1},
          data: {ip: 'ipAdress', ua: 'userAgent'}
        });
      });

      it('should throw BadRequestException if user not found', async () => {
        (prisma.user.update as jest.Mock).mockResolvedValue(null);

        const promise = service.changeIPAndUA(1, 'ipAdress', 'userAgent');

        expect(promise).rejects.toThrow(BadRequestException);
        expect(promise).rejects.toThrow('User not found');

      });

      it('should throw InternalServerErrorException on unexpected error', async () => {
        (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'));

        const promise = service.changeIPAndUA(mockUser.id, 'ipAdress', 'userAgent');

        expect(promise).rejects.toThrow(InternalServerErrorException);
        expect(promise).rejects.toThrow('An error occurred while updating user IP and UA');
      });
    });
  });
});
