import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { LoggerService } from 'src/logger/logger.service';
import { Response } from 'express';
import { createUserDto, mockUser } from '../mocks/index';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let userService: UserService;
  let loggerService: LoggerService

  

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
           provide: AuthService,
           useValue: {
            loginUser: jest.fn(),
            generateToken: jest.fn()
           }
        },
        {
          provide: UserService,
          useValue: {
            createUser: jest.fn()
          }  
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
          },
        },
      ]
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  describe('signUp', () => {
    it('should create a new user and return a success message', async () => {
      (userService.createUser as jest.Mock).mockResolvedValue(null);
      
      const result = await controller.signUp(createUserDto);

      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({ message: 'ok'});
      expect(userService.createUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('logIn', () => {
    it('should log in a user and return an user and success message', async () => {
      (authService.loginUser as jest.Mock).mockResolvedValue(mockUser);
      (authService.generateToken as jest.Mock).mockResolvedValue('mockToken');

      const res = {
        cookie: jest.fn()
      } as unknown as Response;

      const result = await controller.logIn({email: createUserDto.email, password: createUserDto.password}, res);

      expect(authService.loginUser).toHaveBeenCalledWith({email: createUserDto.email, password: createUserDto.password});
      expect(authService.generateToken).toHaveBeenCalledWith(mockUser);
      expect(res.cookie).toHaveBeenCalledWith('token', 'mockToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 2 * 60 * 60 * 1000,
      });
      expect(result).toEqual({ message: 'ok'});

      expect(authService.loginUser).toHaveBeenCalledTimes(1);
      expect(authService.generateToken).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledTimes(1);
    });
  });
});
