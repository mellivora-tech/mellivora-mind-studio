import { pgTable, uuid, text, timestamp, varchar, date, decimal, pgEnum } from 'drizzle-orm/pg-core'

// Enums
export const roleEnum = pgEnum('role', ['LP', 'MANAGER', 'RESEARCHER', 'ADMIN'])

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  role: roleEnum('role').default('LP'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Funds Table
export const funds = pgTable('funds', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
