import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockUser } from '../mocks/index';
import { RedisService } from 'src/redis/redis.service';
import { Response } from 'express';
import { UserService } from 'src/user/user.service';
import { LoggerService } from 'src/logger/logger.service';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';

describe('AuthService', () => {
  let service: AuthService;
  let redis: RedisService;
  let res: Response;
  let userService: UserService


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
          provide: UserService,
          useValue: {
            findUserById: jest.fn(),
            changeIsVerified: jest.fn(),
            create: jest.fn(),
            changeIPAndUA: jest.fn(),
            changePassword: jest.fn()
          }
        },
        {
          provide: RecaptchaService,
          useValue: {
            verifyToken: jest.fn(),
          }
        },
        {
          provide: LoggerService,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
          }
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            incr: jest.fn().mockResolvedValue(0),
            expire: jest.fn().mockResolvedValue(undefined),
            setLoginAttempts: jest.fn().mockResolvedValue(undefined),
            setBannedUser: jest.fn().mockResolvedValue(undefined),
            setVerifyToken: jest.fn().mockResolvedValue(undefined),
            setSession: jest.fn().mockResolvedValue(undefined),
            multi: jest.fn().mockReturnValue({ exec: jest.fn() }),
          }
        },
        {
          provide: 'Response',
          useValue: {
            clearCookie: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    redis = module.get<RedisService>(RedisService);
    res = module.get<Response>('Response');
    userService = module.get<UserService>(UserService);
  });

  describe('handleLogOut', () => {
    it('should handle user logout', async () => {
      const sessionId = 'session123';

      await service.handleLogOut(sessionId, res);

      expect(redis.del).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(res.clearCookie).toHaveBeenCalledWith('sessionId', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      expect(res.clearCookie).toHaveBeenCalledWith('csrfToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
    });

    it('should now call redis.del if sessionId is not provided', async () => {
      await service.handleLogOut('', res);

      expect(redis.del).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException on error', async () => {
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(service.handleLogOut('session123', res)).rejects.toThrow('An error occurred while logging out');
    });
  });

  describe('handleVerifyPassword', () => {
    it('it should verify user, delete token. clear cookie, and create session', async () => {
      (redis.get as jest.Mock).mockResolvedValue({value: mockUser.id})
      (userService.findUserById as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(Object.getPrototypeOf(service), 'createSession').mockResolvedValue(undefined);


      await service.handleVerifyPassword('token123', '127.0.0.1', 'ua', 'newPass', res, 'session123');

      expect(userService.findUserById).toHaveBeenCalledWith(mockUser.id);
      expect(userService.changeIPAndUA).toHaveBeenCalledWith(mockUser.id, '127.0.0.1', 'ua');
      expect(userService.changeIsVerified).toHaveBeenCalledWith(mockUser.id);
      expect(userService.changePassword).toHaveBeenCalledWith('newPass', mockUser.id);

      expect(redis.del).toHaveBeenCalledWith(`verifyToken:${'token123'}`);
      expect(res.clearCookie).toHaveBeenCalledWith('verifyToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      expect(service['createSession']).toHaveBeenCalledWith(
        1,
        'sess123',
        'USER',
        '127.0.0.1',
        'ua',
        res
      );
    });

    it('should throw UnauthorizedException if verify token is not found', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      await expect(service.handleVerifyPassword('token123', '127.0.0.1', 'ua', 'newPass', res, 'session123')).rejects.toThrow('Verify token is invalid or expired');

      expect(redis.get).toHaveBeenCalledWith(`verifyToken:${'token123'}`);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(service.handleVerifyPassword('token123', '127.0.0.1', 'ua', 'newPass', res, 'session123')).rejects.toThrow('An error occurred while verifying');
    });
  });

  describe('handleLogin', () => {
    beforeEach(() => {
      jest.spyOn(Object.getPrototypeOf(service), 'createSession').mockResolvedValue(undefined);
      jest.spyOn(Object.getPrototypeOf(service), 'validateUserAttempts').mockResolvedValue(undefined);
      jest.spyOn(Object.getPrototypeOf(service), 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(Object.getPrototypeOf(service), 'createUnverifiedUser').mockResolvedValue(undefined);
    });

    it('should login verified user successfully', async () => {
      (redis.get as jest.Mock).mockResolvedValue(0);
      (redis.del as jest.Mock).mockResolvedValue(undefined);

      const result = await service.handleLogin(
        { email: mockUser.email, password: 'pass', recaptchaToken: 'token' },
        { ip: '127.0.0.1', ua: 'ua', res }
      );

      expect(service['validateUserAttempts']).toHaveBeenCalledWith(0, mockUser.email, 'token');
      expect(service['validateUser']).toHaveBeenCalledWith(
        { email: mockUser.email, password: 'pass', recaptchaToken: 'token' },
        '127.0.0.1',
        'ua'
      );
      expect(service['createSession']).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        mockUser.role,
        '127.0.0.1',
        'ua',
        res
      );
      expect(redis.del).toHaveBeenCalledWith(`loginAttempts:${mockUser.email}`);
      expect(result).toEqual({ isVerified: true });
    });

    it('should return isVerified: false for unverified user', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      (service as any).validateUser.mockResolvedValueOnce(unverifiedUser);

      const result = await service.handleLogin(
        { email: mockUser.email, password: 'pass', recaptchaToken: 'token' },
        { ip: '127.0.0.1', ua: 'ua', res }
      );

      expect(service['createUnverifiedUser']).toHaveBeenCalledWith(unverifiedUser.id, res, mockUser.email);
      expect(result).toEqual({ isVerified: false });
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (service as any).validateUser.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.handleLogin(
          { email: mockUser.email, password: 'pass', recaptchaToken: 'token' },
          { ip: '127.0.0.1', ua: 'ua', res }
        )
      ).rejects.toThrow('An error occurred while logging in');
    });
  });
});
