import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  function buildContext(user?: { role: UserRole }): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows the request when the route has no @Roles() restriction', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = buildContext({ role: UserRole.FENCER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ORGANIZER]);
    const context = buildContext({ role: UserRole.ORGANIZER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks the request when the user has the wrong role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ORGANIZER]);
    const context = buildContext({ role: UserRole.FENCER });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('blocks the request when there is no user at all', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ORGANIZER]);
    const context = buildContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });
});
