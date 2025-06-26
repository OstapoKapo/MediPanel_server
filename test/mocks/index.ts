export interface IUser {
  id: number;
  email: string;
  password: string;
  role: 'viewer' | 'admin' | 'superadmin';
  createdat: Date;
}

export const mockUser: IUser = {
  id: 1,
  email: 'test@gmail.com',
  password: 'hashedPassword',
  role: 'viewer',
  createdat: new Date('2023-01-01T00:00:00')
};

export interface ICreateUserDto {
  email: string;
  password: string;
  role: 'viewer' | 'admin' | 'superadmin';
}

export const createUserDto: ICreateUserDto = {
  email: 'test@gmail.com',
  password: 'password',
  role: 'viewer'
};
