import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ShiftSwapStatus, type ShiftSwapStatusValue } from '../constants/enums.js';

export class ShiftSwapRequest extends Model<InferAttributes<ShiftSwapRequest>, InferCreationAttributes<ShiftSwapRequest>> {
  declare id: CreationOptional<number>;
  declare requesterShiftId: number;
  declare targetShiftId: number;
  declare requesterEmployeeId: number;
  declare targetEmployeeId: number;
  declare storeId: number;
  declare reason: string;
  declare status: ShiftSwapStatusValue;
  declare peerApprovedAt: Date | null;
  declare managerApprovedAt: Date | null;
  declare peerRejectReason: string | null;
  declare managerRejectReason: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ShiftSwapRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    requesterShiftId: { type: DataTypes.INTEGER, allowNull: false },
    targetShiftId: { type: DataTypes.INTEGER, allowNull: false },
    requesterEmployeeId: { type: DataTypes.INTEGER, allowNull: false },
    targetEmployeeId: { type: DataTypes.INTEGER, allowNull: false },
    storeId: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(ShiftSwapStatus)), allowNull: false, defaultValue: ShiftSwapStatus.PENDING_PEER },
    peerApprovedAt: { type: DataTypes.DATE, allowNull: true },
    managerApprovedAt: { type: DataTypes.DATE, allowNull: true },
    peerRejectReason: { type: DataTypes.TEXT, allowNull: true },
    managerRejectReason: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { sequelize, tableName: 'shift_swap_requests' }
);
