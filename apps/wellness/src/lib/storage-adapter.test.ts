import { describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { capacitorPreferencesStorage } from './storage-adapter';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('capacitorPreferencesStorage', () => {
  it('getItem returns the stored value', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'stored-value' });
    const result = await capacitorPreferencesStorage.getItem('my-key');
    expect(Preferences.get).toHaveBeenCalledWith({ key: 'my-key' });
    expect(result).toBe('stored-value');
  });

  it('getItem returns null when nothing is stored', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    const result = await capacitorPreferencesStorage.getItem('missing-key');
    expect(result).toBeNull();
  });

  it('setItem writes through to Preferences.set', async () => {
    vi.mocked(Preferences.set).mockResolvedValue();
    await capacitorPreferencesStorage.setItem('my-key', 'my-value');
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'my-key', value: 'my-value' });
  });

  it('removeItem writes through to Preferences.remove', async () => {
    vi.mocked(Preferences.remove).mockResolvedValue();
    await capacitorPreferencesStorage.removeItem('my-key');
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'my-key' });
  });
});
