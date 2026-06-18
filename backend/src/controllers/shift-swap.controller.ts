import type { NextFunction, Request, Response } from 'express';
import * as shiftSwapService from '../services/shift-swap.service.js';
import { success, created } from '../utils/response.js';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await shiftSwapService.listSwapRequests(req.query, req.user));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, await shiftSwapService.createSwapRequest(req.body, req.user!, req.ip ?? 'unknown'));
  } catch (error) {
    next(error);
  }
}

export async function peerApprove(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await shiftSwapService.peerApprove(Number(req.params.id), req.user!, req.ip ?? 'unknown'));
  } catch (error) {
    next(error);
  }
}

export async function peerReject(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await shiftSwapService.peerReject(Number(req.params.id), req.body, req.user!, req.ip ?? 'unknown'));
  } catch (error) {
    next(error);
  }
}

export async function managerApprove(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await shiftSwapService.managerApprove(Number(req.params.id), req.user!, req.ip ?? 'unknown'));
  } catch (error) {
    next(error);
  }
}

export async function managerReject(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await shiftSwapService.managerReject(Number(req.params.id), req.body, req.user!, req.ip ?? 'unknown'));
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await shiftSwapService.cancelSwap(Number(req.params.id), req.user!, req.ip ?? 'unknown'));
  } catch (error) {
    next(error);
  }
}
