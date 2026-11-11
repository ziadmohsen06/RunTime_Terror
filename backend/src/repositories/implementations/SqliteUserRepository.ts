import Database from 'better-sqlite3';
import { NewUser, User } from '../../domain/entities/User';
import { IUserRepository } from '../interfaces/IUserRepository';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
}

function mapUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash };
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  async create(user: NewUser): Promise<User> {
    const result = this.db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(user.name, user.email, user.passwordHash);

    return { id: Number(result.lastInsertRowid), name: user.name, email: user.email, passwordHash: user.passwordHash };
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  async findById(id: number): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }
}