import { SetMetadata } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';

export const PERMISSION_MODULE_KEY = 'permissionModule';
export const RequirePermission = (module: PermissionModule) =>
  SetMetadata(PERMISSION_MODULE_KEY, module);
