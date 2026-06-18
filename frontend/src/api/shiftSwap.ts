import { request } from '@/utils/request';

export function fetchShiftSwaps(params = {}) {
  return request.get('/shift-swaps', { params });
}

export function createShiftSwap(data: { requesterShiftId: number; targetShiftId: number; reason: string }) {
  return request.post('/shift-swaps', data);
}

export function peerApproveShiftSwap(id: number) {
  return request.post(`/shift-swaps/${id}/peer-approve`);
}

export function peerRejectShiftSwap(id: number, data: { reason: string }) {
  return request.post(`/shift-swaps/${id}/peer-reject`, data);
}

export function managerApproveShiftSwap(id: number) {
  return request.post(`/shift-swaps/${id}/manager-approve`);
}

export function managerRejectShiftSwap(id: number, data: { reason: string }) {
  return request.post(`/shift-swaps/${id}/manager-reject`, data);
}

export function cancelShiftSwap(id: number) {
  return request.post(`/shift-swaps/${id}/cancel`);
}
