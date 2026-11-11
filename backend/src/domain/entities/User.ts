export interface User {
  id: number;
  email: string;
  passwordHash: string;
}

export type NewUser = Omit<User, 'id'>;
export type PublicUser = Omit<User, 'passwordHash'>;