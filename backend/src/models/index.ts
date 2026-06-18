import { Employee } from './employee.model.js';
import { Store } from './store.model.js';
import { Shift } from './shift.model.js';
import { Transaction } from './transaction.model.js';
import { User } from './user.model.js';
import { AuditLog } from './audit-log.model.js';
import { ShiftSwapRequest } from './shift-swap-request.model.js';

Store.hasMany(Employee, { foreignKey: 'storeId' });
Employee.belongsTo(Store, { foreignKey: 'storeId' });

Store.belongsTo(Employee, { as: 'manager', foreignKey: 'managerId' });
Employee.hasMany(Store, { as: 'managedStores', foreignKey: 'managerId' });

Employee.hasMany(Shift, { foreignKey: 'employeeId' });
Shift.belongsTo(Employee, { foreignKey: 'employeeId' });
Store.hasMany(Shift, { foreignKey: 'storeId' });
Shift.belongsTo(Store, { foreignKey: 'storeId' });

Employee.hasMany(Transaction, { as: 'employeeTransactions', foreignKey: 'relatedEmployeeId' });
Transaction.belongsTo(Employee, { as: 'relatedEmployee', foreignKey: 'relatedEmployeeId' });
Store.hasMany(Transaction, { foreignKey: 'storeId' });
Transaction.belongsTo(Store, { foreignKey: 'storeId' });

User.belongsTo(Employee, { foreignKey: 'employeeId' });
User.belongsTo(Store, { foreignKey: 'storeId' });
AuditLog.belongsTo(User, { foreignKey: 'operatorId' });

ShiftSwapRequest.belongsTo(Shift, { as: 'requesterShift', foreignKey: 'requesterShiftId' });
ShiftSwapRequest.belongsTo(Shift, { as: 'targetShift', foreignKey: 'targetShiftId' });
ShiftSwapRequest.belongsTo(Employee, { as: 'requesterEmployee', foreignKey: 'requesterEmployeeId' });
ShiftSwapRequest.belongsTo(Employee, { as: 'targetEmployee', foreignKey: 'targetEmployeeId' });
ShiftSwapRequest.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(ShiftSwapRequest, { foreignKey: 'storeId' });

export { Employee, Store, Shift, Transaction, User, AuditLog, ShiftSwapRequest };
