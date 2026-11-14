import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  getPlatform: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  register: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
    getPlatform: mocks.getPlatform,
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
    createChannel: mocks.createChannel,
    register: mocks.register,
    addListener: mocks.addListener,
  },
}));

vi.mock('./supabase', () => ({ supabase: {} }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

async function load() {
  vi.resetModules();
  return import('./push');
}

describe('registerPushToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkPermissions.mockResolvedValue({ receive: 'granted' });
    mocks.requestPermissions.mockResolvedValue({ receive: 'granted' });
    mocks.createChannel.mockResolvedValue(undefined);
    mocks.register.mockResolvedValue(undefined);
  });

  it('registerPushToken creates the default channel on android', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.getPlatform.mockReturnValue('android');
    const { registerPushToken } = await load();

    await registerPushToken('user-1');

    expect(mocks.createChannel).toHaveBeenCalledTimes(1);
    expect(mocks.createChannel).toHaveBeenCalledWith({
      id: 'default',
      name: 'Care Bridge alerts',
      importance: 4,
    });
    expect(mocks.createChannel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.register.mock.invocationCallOrder[0],
    );
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });

  it('registerPushToken does not create a channel on ios', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.getPlatform.mockReturnValue('ios');
    const { registerPushToken } = await load();

    await registerPushToken('user-1');

    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });

  it('registerPushToken does nothing on web', async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.getPlatform.mockReturnValue('web');
    const { registerPushToken } = await load();

    await registerPushToken('user-1');

    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.checkPermissions).not.toHaveBeenCalled();
  });

  it('registerPushToken does not create a channel or register when permission is denied', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.getPlatform.mockReturnValue('android');
    mocks.checkPermissions.mockResolvedValue({ receive: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ receive: 'denied' });
    const { registerPushToken } = await load();

    await registerPushToken('user-1');

    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
