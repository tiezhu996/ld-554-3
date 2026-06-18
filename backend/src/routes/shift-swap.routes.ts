import { Router } from 'express';
import * as controller from '../controllers/shift-swap.controller.js';
import { UserRole } from '../constants/enums.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { requireFields } from '../middlewares/validator.middleware.js';

export const shiftSwapRoutes = Router();

shiftSwapRoutes.get('/', controller.index);
shiftSwapRoutes.post('/', requireFields(['requesterShiftId', 'targetShiftId', 'reason']), controller.create);
shiftSwapRoutes.post('/:id/peer-approve', controller.peerApprove);
shiftSwapRoutes.post('/:id/peer-reject', requireFields(['reason']), controller.peerReject);
shiftSwapRoutes.post('/:id/manager-approve', requireRoles([UserRole.OWNER, UserRole.MANAGER]), controller.managerApprove);
shiftSwapRoutes.post('/:id/manager-reject', requireRoles([UserRole.OWNER, UserRole.MANAGER]), requireFields(['reason']), controller.managerReject);
shiftSwapRoutes.post('/:id/cancel', controller.cancel);
