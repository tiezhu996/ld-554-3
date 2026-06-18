<template>
  <div class="swap-box">
    <div class="swap-header">
      <el-steps :active="swapStep" finish-status="success" size="small">
        <el-step title="员工发起" />
        <el-step title="对方确认" />
        <el-step title="店长审批" />
      </el-steps>
    </div>
    <el-alert type="info" show-icon :closable="false" class="swap-alert">
      换班流转已纳入审计范围，审批后会记录到操作日志。同班次同时只允许一个待处理申请，避免撞班和漏批。
    </el-alert>

    <div class="swap-tabs">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="发起换班" name="create">
          <el-form :model="createForm" label-width="88px" class="create-form">
            <el-form-item label="我的班次">
              <el-select v-model="createForm.requesterShiftId" placeholder="请选择自己的班次" style="width: 100%">
                <el-option
                  v-for="item in myShifts"
                  :key="item.id"
                  :label="`${item.date} ${ShiftTypeLabel[item.shiftType as keyof typeof ShiftTypeLabel]} ${item.startTime}-${item.endTime}`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="换班对象">
              <el-select v-model="createForm.targetShiftId" placeholder="选择对方班次" style="width: 100%">
                <el-option
                  v-for="item in otherShifts"
                  :key="item.id"
                  :label="`${item.employee?.name ?? '员工'} ${item.date} ${ShiftTypeLabel[item.shiftType as keyof typeof ShiftTypeLabel]}`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="换班理由">
              <el-input v-model="createForm.reason" type="textarea" :rows="3" placeholder="请说明换班原因" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="!canSubmit" @click="submitCreate">提交申请</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="申请记录" name="list">
          <div class="swap-filter">
            <el-select v-model="listFilter.status" placeholder="状态筛选" clearable style="width: 180px">
              <el-option v-for="(label, value) in ShiftSwapStatusLabel" :key="value" :label="label" :value="value" />
            </el-select>
            <el-button @click="loadSwaps">刷新</el-button>
          </div>
          <div v-if="swaps.length === 0" class="empty-box">
            <el-empty description="暂无换班记录" :image-size="80" />
          </div>
          <div v-else class="swap-list">
            <div v-for="swap in swaps" :key="swap.id" class="swap-card">
              <div class="swap-card-top">
                <el-tag :type="statusTagType(swap.status)">{{ ShiftSwapStatusLabel[swap.status as keyof typeof ShiftSwapStatusLabel] }}</el-tag>
                <span class="swap-time">{{ formatDate(swap.createdAt) }}</span>
              </div>
              <div class="swap-people">
                <div class="swap-person">
                  <EmployeeAvatar :name="swap.requesterEmployee?.name ?? '申请人'" :employee-no="swap.requesterEmployee?.employeeNo ?? 'EMP'" size="sm" />
                  <div class="swap-shift-info">
                    <strong>{{ swap.requesterEmployee?.name ?? '申请人' }}</strong>
                    <small>{{ swap.requesterShift?.date }} {{ ShiftTypeLabel[swap.requesterShift?.shiftType as keyof typeof ShiftTypeLabel] }}</small>
                    <small>{{ swap.requesterShift?.startTime }} - {{ swap.requesterShift?.endTime }}</small>
                  </div>
                </div>
                <el-icon class="swap-arrow"><Switch /></el-icon>
                <div class="swap-person">
                  <EmployeeAvatar :name="swap.targetEmployee?.name ?? '对方'" :employee-no="swap.targetEmployee?.employeeNo ?? 'EMP'" size="sm" />
                  <div class="swap-shift-info">
                    <strong>{{ swap.targetEmployee?.name ?? '对方' }}</strong>
                    <small>{{ swap.targetShift?.date }} {{ ShiftTypeLabel[swap.targetShift?.shiftType as keyof typeof ShiftTypeLabel] }}</small>
                    <small>{{ swap.targetShift?.startTime }} - {{ swap.targetShift?.endTime }}</small>
                  </div>
                </div>
              </div>
              <div class="swap-reason">
                <span>理由：{{ swap.reason }}</span>
                <span v-if="swap.peerRejectReason" class="reject">对方拒绝原因：{{ swap.peerRejectReason }}</span>
                <span v-if="swap.managerRejectReason" class="reject">店长驳回原因：{{ swap.managerRejectReason }}</span>
              </div>
              <div class="swap-actions">
                <el-button v-if="canCancel(swap)" size="small" @click="handleCancel(swap.id)">取消</el-button>
                <el-button v-if="canPeerApprove(swap)" size="small" type="success" @click="handlePeerApprove(swap.id)">同意换班</el-button>
                <el-popconfirm v-if="canPeerReject(swap)" title="请填写拒绝原因" @confirm="openPeerRejectDialog(swap.id)">
                  <template #reference>
                    <el-button size="small" type="danger">拒绝</el-button>
                  </template>
                </el-popconfirm>
                <el-button v-if="canManagerApprove(swap)" size="small" type="primary" @click="handleManagerApprove(swap.id)">审批通过</el-button>
                <el-popconfirm v-if="canManagerReject(swap)" title="请填写驳回原因" @confirm="openManagerRejectDialog(swap.id)">
                  <template #reference>
                    <el-button size="small" type="warning">驳回</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="rejectDialog.visible" :title="rejectDialog.title" width="420px">
      <el-input v-model="rejectDialog.reason" type="textarea" :rows="3" placeholder="请填写原因" />
      <template #footer>
        <el-button @click="rejectDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance } from 'element-plus';
import { Switch } from '@element-plus/icons-vue';
import EmployeeAvatar from '@/components/common/EmployeeAvatar.vue';
import { ShiftTypeLabel, ShiftSwapStatus, ShiftSwapStatusLabel, UserRole } from '@/constants/enums';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import {
  cancelShiftSwap,
  createShiftSwap,
  fetchShiftSwaps,
  managerApproveShiftSwap,
  managerRejectShiftSwap,
  peerApproveShiftSwap,
  peerRejectShiftSwap
} from '@/api/shiftSwap';
import type { ShiftSwapRequest as ShiftSwapRequestType } from '@/types/shift';

const auth = useAuthStore();
const shiftStore = useShiftStore();

const activeTab = ref('list');
const swaps = ref<ShiftSwapRequestType[]>([]);
const listFilter = reactive({ status: '' });

const createForm = reactive<{ requesterShiftId: number | null; targetShiftId: number | null; reason: string }>({
  requesterShiftId: null,
  targetShiftId: null,
  reason: ''
});

const rejectDialog = reactive({
  visible: false,
  title: '拒绝换班',
  type: 'peer' as 'peer' | 'manager',
  swapId: 0,
  reason: ''
});

const swapStep = computed(() => {
  const active = swaps.value.find((s) => s.status === ShiftSwapStatus.PENDING_PEER || s.status === ShiftSwapStatus.PEER_APPROVED);
  if (!active) return 0;
  if (active.status === ShiftSwapStatus.PENDING_PEER) return 1;
  return 2;
});

const currentEmployeeId = computed(() => auth.user?.employeeId ?? null);
const isManager = computed(() => auth.user?.role === UserRole.OWNER || auth.user?.role === UserRole.MANAGER);

const myShifts = computed(() => {
  if (!currentEmployeeId.value) return [];
  return shiftStore.list.filter((s) => s.employeeId === currentEmployeeId.value);
});

const otherShifts = computed(() => {
  const selectedReq = createForm.requesterShiftId;
  const reqShift = shiftStore.list.find((s) => s.id === selectedReq);
  const storeId = reqShift?.storeId ?? auth.user?.storeId;
  return shiftStore.list.filter((s) => {
    if (currentEmployeeId.value && s.employeeId === currentEmployeeId.value) return false;
    if (storeId && s.storeId !== storeId) return false;
    return true;
  });
});

const canSubmit = computed(() => {
  return createForm.requesterShiftId && createForm.targetShiftId && createForm.reason.trim().length > 0;
});

function formatDate(date: string) {
  return new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusTagType(status: string) {
  switch (status) {
    case ShiftSwapStatus.PENDING_PEER:
      return 'warning';
    case ShiftSwapStatus.PEER_APPROVED:
      return 'primary';
    case ShiftSwapStatus.MANAGER_APPROVED:
      return 'success';
    case ShiftSwapStatus.PEER_REJECTED:
    case ShiftSwapStatus.MANAGER_REJECTED:
    case ShiftSwapStatus.CANCELLED:
      return 'info';
    default:
      return '';
  }
}

function canCancel(swap: ShiftSwapRequestType) {
  if (swap.status !== ShiftSwapStatus.PENDING_PEER && swap.status !== ShiftSwapStatus.PEER_APPROVED) return false;
  if (isManager.value) return true;
  return currentEmployeeId.value === swap.requesterEmployeeId;
}

function canPeerApprove(swap: ShiftSwapRequestType) {
  if (swap.status !== ShiftSwapStatus.PENDING_PEER) return false;
  if (isManager.value) return true;
  return currentEmployeeId.value === swap.targetEmployeeId;
}

function canPeerReject(swap: ShiftSwapRequestType) {
  return canPeerApprove(swap);
}

function canManagerApprove(swap: ShiftSwapRequestType) {
  return swap.status === ShiftSwapStatus.PEER_APPROVED && isManager.value;
}

function canManagerReject(swap: ShiftSwapRequestType) {
  return canManagerApprove(swap);
}

async function loadSwaps() {
  const params: Record<string, unknown> = {};
  if (listFilter.status) params.status = listFilter.status;
  const res = (await fetchShiftSwaps(params)) as { data: { list: ShiftSwapRequestType[] } };
  swaps.value = res.data.list;
}

async function submitCreate() {
  if (!canSubmit.value) return;
  try {
    await createShiftSwap({
      requesterShiftId: createForm.requesterShiftId!,
      targetShiftId: createForm.targetShiftId!,
      reason: createForm.reason
    });
    ElMessage.success('换班申请已提交，等待对方确认');
    createForm.requesterShiftId = null;
    createForm.targetShiftId = null;
    createForm.reason = '';
    activeTab.value = 'list';
    await loadSwaps();
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败');
  }
}

async function handleCancel(id: number) {
  await cancelShiftSwap(id);
  ElMessage.success('已取消申请');
  await loadSwaps();
}

async function handlePeerApprove(id: number) {
  await peerApproveShiftSwap(id);
  ElMessage.success('已确认同意，等待店长审批');
  await loadSwaps();
}

async function handleManagerApprove(id: number) {
  await managerApproveShiftSwap(id);
  ElMessage.success('审批通过，已自动完成班次互换');
  await loadSwaps();
  await shiftStore.load();
}

function openPeerRejectDialog(id: number) {
  rejectDialog.visible = true;
  rejectDialog.title = '拒绝换班';
  rejectDialog.type = 'peer';
  rejectDialog.swapId = id;
  rejectDialog.reason = '';
}

function openManagerRejectDialog(id: number) {
  rejectDialog.visible = true;
  rejectDialog.title = '驳回申请';
  rejectDialog.type = 'manager';
  rejectDialog.swapId = id;
  rejectDialog.reason = '';
}

async function confirmReject() {
  if (!rejectDialog.reason.trim()) {
    ElMessage.warning('请填写原因');
    return;
  }
  try {
    if (rejectDialog.type === 'peer') {
      await peerRejectShiftSwap(rejectDialog.swapId, { reason: rejectDialog.reason });
      ElMessage.success('已拒绝');
    } else {
      await managerRejectShiftSwap(rejectDialog.swapId, { reason: rejectDialog.reason });
      ElMessage.success('已驳回');
    }
    rejectDialog.visible = false;
    await loadSwaps();
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败');
  }
}

watch(
  () => listFilter.status,
  () => loadSwaps()
);

onMounted(loadSwaps);
</script>

<style scoped>
.swap-box {
  display: grid;
  gap: 16px;
}

.swap-alert {
  margin: 0;
}

.create-form {
  margin-top: 8px;
}

.swap-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.empty-box {
  padding: 24px;
}

.swap-list {
  display: grid;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
}

.swap-card {
  border: 1px solid #e8e2d5;
  border-radius: 10px;
  padding: 14px;
  display: grid;
  gap: 10px;
  background: #fdfbf6;
}

.swap-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.swap-time {
  color: #8a8272;
  font-size: 12px;
}

.swap-people {
  display: flex;
  align-items: center;
  gap: 10px;
}

.swap-person {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #f4f1ea;
  border-radius: 8px;
}

.swap-arrow {
  color: #8a8272;
  font-size: 20px;
}

.swap-shift-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.swap-shift-info strong {
  font-size: 14px;
}

.swap-shift-info small {
  color: #6a6153;
  font-size: 12px;
}

.swap-reason {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #554c3d;
}

.swap-reason .reject {
  color: #c2574a;
}

.swap-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
