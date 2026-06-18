import type { ShiftType, ShiftSwapStatus } from '@/constants/enums';

export interface Shift {
  id: number;
  employeeId: number;
  employee?: { name: string; employeeNo: string };
  date: string;
  shiftType: keyof typeof ShiftType;
  startTime: string;
  endTime: string;
  storeId: number;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN';
}

export interface ShiftSwapRequest {
  id: number;
  requesterShiftId: number;
  targetShiftId: number;
  requesterEmployeeId: number;
  targetEmployeeId: number;
  storeId: number;
  reason: string;
  status: keyof typeof ShiftSwapStatus;
  peerApprovedAt: string | null;
  managerApprovedAt: string | null;
  peerRejectReason: string | null;
  managerRejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  requesterEmployee?: { id: number; name: string; employeeNo: string };
  targetEmployee?: { id: number; name: string; employeeNo: string };
  requesterShift?: { id: number; date: string; shiftType: keyof typeof ShiftType; startTime: string; endTime: string };
  targetShift?: { id: number; date: string; shiftType: keyof typeof ShiftType; startTime: string; endTime: string };
  store?: { id: number; name: string };
}
