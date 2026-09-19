<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-text">用户管理</div>
      <el-button type="primary" :icon="Plus" @click="openAdd">添加用户</el-button>
    </div>

    <div class="panel">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id"          label="ID"     width="50" />
        <el-table-column prop="userAccount" label="账号"   min-width="70" />
        <el-table-column prop="name"        label="姓名"   width="120" />
        <el-table-column prop="phone"       label="手机"   width="140" />
        <el-table-column prop="email"       label="邮箱"   min-width="180" show-overflow-tooltip />
        <el-table-column label="权限" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.identity === 2 ? 'danger' : 'info'" effect="plain">
              {{ row.identity === 2 ? '超级管理员' : '普通管理员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger"  @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @change="load"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '添加用户'" width="480px" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="账号" prop="userAccount">
          <el-input v-model="form.userAccount" :disabled="isEdit" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? '' : 'password'">
          <el-input v-model="form.password" type="password" show-password
            :placeholder="isEdit ? '留空不修改' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="真实姓名" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="手机">
              <el-input v-model="form.phone" placeholder="手机号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="电子邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="权限">
          <el-select v-model="form.identity" style="width:100%">
            <el-option label="普通管理员" :value="1" />
            <el-option label="超级管理员" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api/admin'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const list     = ref([])
const loading  = ref(false)
const saving   = ref(false)
const page     = ref(1)
const pageSize = ref(20)
const total    = ref(0)
const dialogVisible = ref(false)
const isEdit   = ref(false)
const formRef  = ref()
const form     = ref({ userAccount: '', password: '', name: '', phone: '', email: '', identity: 1 })

const rules = {
  userAccount: [{ required: true, message: '请输入账号' }],
  password:    [{ required: true, message: '请输入密码' }],
}

async function load() {
  loading.value = true
  try {
    const res = await listAdmins({ page: page.value, pageSize: pageSize.value })
    list.value  = res?.list  ?? res ?? []
    total.value = res?.total ?? 0
  } finally { loading.value = false }
}

function openAdd() {
  isEdit.value = false
  form.value = { userAccount: '', password: '', name: '', phone: '', email: '', identity: 1 }
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  form.value   = { ...row, password: '' }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { ...form.value }
    if (isEdit.value && !payload.password) delete payload.password
    isEdit.value ? await updateAdmin(form.value.id, payload) : await createAdmin(payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load()
  } finally { saving.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除用户「${row.userAccount}」？`, '删除确认', { type: 'warning' })
  await deleteAdmin(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
