export interface IUser {
  id: number;
  email: string;
  password: string;
  role: 'viewer' | 'admin' | 'superadmin';
  createdat: Date;
  isVerified: boolean,
  ip: string,
  ua: string
}

export const mockUser: IUser = {
  id: 1,
  email: 'test@gmail.com',
  password: 'hashedPassword',
  role: 'viewer',
  createdat: new Date('2023-01-01T00:00:00'),
  isVerified: false,
  ip: 'unknown',
  ua: 'unknown'
};

export interface ICreateUserDto {
  email: string;
  role: 'doctor' | 'admin' | 'viewer';
}

export const createUserDto: ICreateUserDto = {
  email: 'test@gmail.com',
  role: 'viewer'
};

export interface ILoginDto {
    email: string;
    password: string;
  }

export const dto: ILoginDto = {
    email: 'test@example.com',
    password: 'plainPassword', 
  };
