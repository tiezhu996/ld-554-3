import { Op, type WhereOptions } from 'sequelize';
import { ShiftSwapRequest, Shift, Employee, Store, sequelize } from '../models/index.js';
import { ShiftSwapStatus, UserRole } from '../constants/enums.js';
import { getPagination } from '../utils/pagination.js';
import { storeScope } from './scope.service.js';
import { recordAudit } from './audit.service.js';
import type { AuthUser } from '../types/request.js';

export async function listSwapRequests(query: Record<string, unknown>, user?: AuthUser) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where: WhereOptions = { ...storeScope(user) };
  if (query.status) Object.assign(where, { status: query.status });

  if (user?.role === UserRole.EMPLOYEE && user.employeeId) {
    Object.assign(where, {
      [Op.or]: [{ requesterEmployeeId: user.employeeId }, { targetEmployeeId: user.employeeId }]
    });
  }

  const { rows, count } = await ShiftSwapRequest.findAndCountAll({
    where,
    limit,
    offset,
    include: [
      { model: Employee, as: 'requesterEmployee', attributes: ['id', 'name', 'employeeNo'] },
      { model: Employee, as: 'targetEmployee', attributes: ['id', 'name', 'employeeNo'] },
      { model: Shift, as: 'requesterShift', attributes: ['id', 'date', 'shiftType', 'startTime', 'endTime'] },
      { model: Shift, as: 'targetShift', attributes: ['id', 'date', 'shiftType', 'startTime', 'endTime'] },
      { model: Store, attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });
  return { list: rows, total: count, page, pageSize };
}

export async function createSwapRequest(payload: Record<string, unknown>, user: AuthUser, ip: string) {
  const { requesterShiftId, targetShiftId, reason } = payload;

  const requesterShift = await Shift.findByPk(Number(requesterShiftId));
  if (!requesterShift) throw Object.assign(new Error('申请人排班不存在'), { status: 404 });

  const targetShift = await Shift.findByPk(Number(targetShiftId));
  if (!targetShift) throw Object.assign(new Error('目标排班不存在'), { status: 404 });

  if (requesterShift.employeeId === targetShift.employeeId) {
    throw Object.assign(new Error('不能与自己换班'), { status: 400 });
  }

  if (requesterShift.storeId !== targetShift.storeId) {
    throw Object.assign(new Error('只能与同门店员工换班'), { status: 400 });
  }

  if (user.role === UserRole.EMPLOYEE && user.employeeId !== requesterShift.employeeId) {
    throw Object.assign(new Error('只能为自己申请换班'), { status: 403 });
  }

  const existingPending = await ShiftSwapRequest.findOne({
    where: {
      [Op.or]: [
        { requesterShiftId: requesterShift.id, status: { [Op.in]: [ShiftSwapStatus.PENDING_PEER, ShiftSwapStatus.PEER_APPROVED] } },
        { targetShiftId: requesterShift.id, status: { [Op.in]: [ShiftSwapStatus.PENDING_PEER, ShiftSwapStatus.PEER_APPROVED] } },
        { requesterShiftId: targetShift.id, status: { [Op.in]: [ShiftSwapStatus.PENDING_PEER, ShiftSwapStatus.PEER_APPROVED] } },
        { targetShiftId: targetShift.id, status: { [Op.in]: [ShiftSwapStatus.PENDING_PEER, ShiftSwapStatus.PEER_APPROVED] } }
      ]
    }
  });
  if (existingPending) {
    throw Object.assign(new Error('该班次已有待处理的换班申请，请先处理'), { status: 400 });
  }

  const result = await ShiftSwapRequest.create({
    requesterShiftId: requesterShift.id,
    targetShiftId: targetShift.id,
    requesterEmployeeId: requesterShift.employeeId,
    targetEmployeeId: targetShift.employeeId,
    storeId: requesterShift.storeId,
    reason: reason as string,
    status: ShiftSwapStatus.PENDING_PEER
  } as never);

  await recordAudit({
    operatorId: user.id,
    action: 'CREATE_SHIFT_SWAP',
    target: `shift_swap_requests/${result.id}`,
    newValue: { requesterShiftId, targetShiftId, reason },
    ip
  });

  return result;
}

export async function peerApprove(id: number, user: AuthUser, ip: string) {
  const request = await ShiftSwapRequest.findByPk(id);
  if (!request) throw Object.assign(new Error('换班申请不存在'), { status: 404 });

  if (request.status !== ShiftSwapStatus.PENDING_PEER) {
    throw Object.assign(new Error('当前状态不可审批'), { status: 400 });
  }

  if (user.role === UserRole.EMPLOYEE && user.employeeId !== request.targetEmployeeId) {
    throw Object.assign(new Error('只有被申请人可以确认'), { status: 403 });
  }

  const oldValue = { status: request.status };
  request.status = ShiftSwapStatus.PEER_APPROVED;
  request.peerApprovedAt = new Date();
  await request.save();

  await recordAudit({
    operatorId: user.id,
    action: 'PEER_APPROVE_SHIFT_SWAP',
    target: `shift_swap_requests/${id}`,
    oldValue,
    newValue: { status: request.status },
    ip
  });

  return request;
}

export async function peerReject(id: number, payload: Record<string, unknown>, user: AuthUser, ip: string) {
  const request = await ShiftSwapRequest.findByPk(id);
  if (!request) throw Object.assign(new Error('换班申请不存在'), { status: 404 });

  if (request.status !== ShiftSwapStatus.PENDING_PEER) {
    throw Object.assign(new Error('当前状态不可审批'), { status: 400 });
  }

  if (user.role === UserRole.EMPLOYEE && user.employeeId !== request.targetEmployeeId) {
    throw Object.assign(new Error('只有被申请人可以拒绝'), { status: 403 });
  }

  const oldValue = { status: request.status };
  request.status = ShiftSwapStatus.PEER_REJECTED;
  request.peerRejectReason = (payload.reason as string) || '无';
  await request.save();

  await recordAudit({
    operatorId: user.id,
    action: 'PEER_REJECT_SHIFT_SWAP',
    target: `shift_swap_requests/${id}`,
    oldValue,
    newValue: { status: request.status, rejectReason: request.peerRejectReason },
    ip
  });

  return request;
}

export async function managerApprove(id: number, user: AuthUser, ip: string) {
  const request = await ShiftSwapRequest.findByPk(id);
  if (!request) throw Object.assign(new Error('换班申请不存在'), { status: 404 });

  if (request.status !== ShiftSwapStatus.PEER_APPROVED) {
    throw Object.assign(new Error('请先完成对方确认环节'), { status: 400 });
  }

  const transaction = await sequelize.transaction();
  try {
    const requesterShift = await Shift.findByPk(request.requesterShiftId, { transaction });
    const targetShift = await Shift.findByPk(request.targetShiftId, { transaction });

    if (!requesterShift || !targetShift) {
      throw Object.assign(new Error('排班数据异常'), { status: 404 });
    }

    const oldRequesterShift = { ...requesterShift.toJSON() };
    const oldTargetShift = { ...targetShift.toJSON() };

    const requesterEmployeeId = requesterShift.employeeId;
    requesterShift.employeeId = targetShift.employeeId;
    targetShift.employeeId = requesterEmployeeId;

    await requesterShift.save({ transaction });
    await targetShift.save({ transaction });

    const oldValue = { status: request.status };
    request.status = ShiftSwapStatus.MANAGER_APPROVED;
    request.managerApprovedAt = new Date();
    await request.save({ transaction });

    await transaction.commit();

    await recordAudit({
      operatorId: user.id,
      action: 'MANAGER_APPROVE_SHIFT_SWAP',
      target: `shift_swap_requests/${id}`,
      oldValue,
      newValue: { status: request.status },
      ip
    });

    await recordAudit({
      operatorId: user.id,
      action: 'AUTO_SWAP_SHIFT_EXEC',
      target: `shifts/${requesterShift.id}`,
      oldValue: { employeeId: oldRequesterShift.employeeId },
      newValue: { employeeId: requesterShift.employeeId },
      ip
    });

    await recordAudit({
      operatorId: user.id,
      action: 'AUTO_SWAP_SHIFT_EXEC',
      target: `shifts/${targetShift.id}`,
      oldValue: { employeeId: oldTargetShift.employeeId },
      newValue: { employeeId: targetShift.employeeId },
      ip
    });

    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function managerReject(id: number, payload: Record<string, unknown>, user: AuthUser, ip: string) {
  const request = await ShiftSwapRequest.findByPk(id);
  if (!request) throw Object.assign(new Error('换班申请不存在'), { status: 404 });

  if (request.status !== ShiftSwapStatus.PEER_APPROVED) {
    throw Object.assign(new Error('当前状态不可审批'), { status: 400 });
  }

  const oldValue = { status: request.status };
  request.status = ShiftSwapStatus.MANAGER_REJECTED;
  request.managerRejectReason = (payload.reason as string) || '无';
  await request.save();

  await recordAudit({
    operatorId: user.id,
    action: 'MANAGER_REJECT_SHIFT_SWAP',
    target: `shift_swap_requests/${id}`,
    oldValue,
    newValue: { status: request.status, rejectReason: request.managerRejectReason },
    ip
  });

  return request;
}

export async function cancelSwap(id: number, user: AuthUser, ip: string) {
  const request = await ShiftSwapRequest.findByPk(id);
  if (!request) throw Object.assign(new Error('换班申请不存在'), { status: 404 });

  if (request.status !== ShiftSwapStatus.PENDING_PEER && request.status !== ShiftSwapStatus.PEER_APPROVED) {
    throw Object.assign(new Error('当前状态不可取消'), { status: 400 });
  }

  if (user.role === UserRole.EMPLOYEE && user.employeeId !== request.requesterEmployeeId) {
    throw Object.assign(new Error('只有申请人可以取消'), { status: 403 });
  }

  const oldValue = { status: request.status };
  request.status = ShiftSwapStatus.CANCELLED;
  await request.save();

  await recordAudit({
    operatorId: user.id,
    action: 'CANCEL_SHIFT_SWAP',
    target: `shift_swap_requests/${id}`,
    oldValue,
    newValue: { status: request.status },
    ip
  });

  return request;
}
