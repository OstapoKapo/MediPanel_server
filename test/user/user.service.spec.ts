import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createUserDto, mockUser } from '../mocks/index';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  let logger: LoggerService;

  

  console.log('env', process.env.USER_PEPER);

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
    logger = module.get<LoggerService>(LoggerService);
  });

  describe('findUserByEmail', () => {
    it('should return a user by email', async () => {
      ((prisma.user.findUnique) as jest.Mock).mockResolvedValue(mockUser);

      const user = await service.findUserByEmail(mockUser.email);
      expect(user).toEqual(mockUser);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: mockUser.email}
      });
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const promise = service.findUserByEmail(mockUser.email);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: mockUser.email}
      });

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('User not found');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DataBase error'));

      const promise = service.findUserByEmail(mockUser.email);

      await expect(promise).rejects.toThrow('An error occurred while finding user by email');
      await expect(promise).rejects.toThrow(InternalServerErrorException);

       expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const hashedPassword = 'hashedPassword';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); 
      (prisma.user.create as jest.Mock).mockResolvedValue('User created successfully');
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue(mockUser.password);

      const user = await service.createUser(createUserDto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          role: createUserDto.role,
          createdat: expect.any(Date),
        }
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: createUserDto.email}
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password + process.env.USER_PEPER, 10);
      expect(user).toEqual('User created successfully');
    
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const promise = service.createUser(createUserDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: createUserDto.email}
      });

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('User with this email already exists');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const promise = service.createUser(createUserDto);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {email: createUserDto.email}
      });
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toThrow('An error occurred while creating user');
    });
  });
});
