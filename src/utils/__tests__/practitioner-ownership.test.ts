import { describe, expect, it, beforeEach } from 'vitest';
import {
  storeOwnedRoleIds,
  getOwnedRoleIds,
  clearOwnedRoleIds,
  isOwnedRole
} from '../practitioner-ownership';

const STORAGE_KEY = 'practitioner_role_ids';

describe('practitioner-ownership', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('storeOwnedRoleIds', () => {
    it('stores an array of role IDs in localStorage', () => {
      storeOwnedRoleIds(['role-1', 'role-2']);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify(['role-1', 'role-2'])
      );
    });

    it('overwrites existing stored IDs', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['old-role']));
      storeOwnedRoleIds(['new-role']);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify(['new-role'])
      );
    });

    it('stores an empty array when given empty input', () => {
      storeOwnedRoleIds([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([]));
    });
  });

  describe('getOwnedRoleIds', () => {
    it('retrieves stored role IDs', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['role-1', 'role-2']));
      expect(getOwnedRoleIds()).toEqual(['role-1', 'role-2']);
    });

    it('returns empty array when nothing is stored', () => {
      expect(getOwnedRoleIds()).toEqual([]);
    });

    it('returns empty array when stored value is malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json');
      expect(getOwnedRoleIds()).toEqual([]);
    });
  });

  describe('clearOwnedRoleIds', () => {
    it('removes the stored role IDs from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['role-1']));
      clearOwnedRoleIds();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when nothing is stored', () => {
      expect(() => clearOwnedRoleIds()).not.toThrow();
    });
  });

  describe('isOwnedRole', () => {
    it('returns true when the ID is in the stored list', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(['role-1', 'role-2', 'role-3'])
      );
      expect(isOwnedRole('role-2')).toBe(true);
    });

    it('returns false when the ID is not in the stored list', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['role-1', 'role-3']));
      expect(isOwnedRole('role-2')).toBe(false);
    });

    it('returns false when nothing is stored', () => {
      expect(isOwnedRole('role-any')).toBe(false);
    });
  });
});
