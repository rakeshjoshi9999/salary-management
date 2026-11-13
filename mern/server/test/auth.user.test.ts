import bcrypt from 'bcrypt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedHrManager } from '../src/auth/seed.js';
import { User } from '../src/auth/user.model.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { PASSWORD } from './helpers/auth.js';
import { startMongo } from './helpers/mongo.js';

/** The User model and its `pre('save')` hook (lesson 2), and the first-manager seed. One container. */
describe('users', () => {
  let mongo: Awaited<ReturnType<typeof startMongo>>;

  beforeAll(async () => {
    mongo = await startMongo();
    await connectDb(mongo.uri);
    await User.init(); // builds the unique index; a test must not race it
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('the User model', () => {
    it('hashesPasswordOnSave', async () => {
      const user = await User.create({ email: 'a@example.com', password: PASSWORD });

      const stored = await User.findById(user.id).select('+password');

      expect(stored?.password).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, stored!.password)).toBe(true);
      expect(bcrypt.getRounds(stored!.password)).toBe(12);
    });

    it('doesNotRehashWhenPasswordIsUnchanged', async () => {
      const user = await User.create({ email: 'a@example.com', password: PASSWORD });
      const before = (await User.findById(user.id).select('+password'))!.password;
      expect(before).toMatch(/^\$2[aby]\$12\$/); // a real bcrypt hash, so "unchanged" means something

      const loaded = await User.findById(user.id).select('+password');
      loaded!.role = 'HR_MANAGER';
      await loaded!.save();

      const after = (await User.findById(user.id).select('+password'))!.password;
      expect(after).toBe(before);
    });

    it('comparePasswordAcceptsOnlyTheCorrectPassword', async () => {
      await User.create({ email: 'a@example.com', password: PASSWORD });
      const user = await User.findOne({ email: 'a@example.com' }).select('+password');

      expect(await user!.comparePassword(PASSWORD)).toBe(true);
      expect(await user!.comparePassword('not the password')).toBe(false);
    });

    it('rejectsDuplicateEmailIgnoringCase', async () => {
      await User.create({ email: 'Ana@Example.com', password: PASSWORD });

      await expect(
        User.create({ email: 'ana@example.com', password: PASSWORD }),
      ).rejects.toMatchObject({ code: 11000 }); // MongoDB's duplicate key error
    });

    it('neverSerialisesThePasswordHash', async () => {
      const created = await User.create({ email: 'a@example.com', password: PASSWORD });
      const found = await User.findOne({ email: 'a@example.com' });

      expect(created.toJSON()).not.toHaveProperty('password');
      expect(JSON.stringify(found)).not.toMatch(/password/);
    });
  });

  describe('seedHrManager', () => {
    it('seedCreatesTheHrManagerAndIsIdempotent', async () => {
      await seedHrManager({ email: 'hr@example.com', password: PASSWORD });
      await seedHrManager({ email: 'hr@example.com', password: PASSWORD });

      const managers = await User.find({ email: 'hr@example.com' }).select('+password');
      expect(managers).toHaveLength(1);
      expect(managers[0]!.role).toBe('HR_MANAGER');
      expect(await managers[0]!.comparePassword(PASSWORD)).toBe(true);
    });
  });
});
