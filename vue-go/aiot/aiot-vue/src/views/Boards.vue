<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-text">控制板管理</div>
      <el-button type="primary" :icon="Plus" @click="openAdd">添加控制板</el-button>
    </div>

    <div class="panel">
      <el-table :data="pagedList" v-loading="loading" stripe>
        <el-table-column prop="id"   label="ID"   width="70" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
              {{ row.status === 1 ? '启用' : '禁用' }}
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
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="list.length"
          layout="total, sizes, prev, pager, next"
          small
          background
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑控制板' : '添加控制板'" width="420px" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="70px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="控制板名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
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
import { ref, computed, onMounted } from 'vue'
import { listBoards, createBoard, updateBoard, deleteBoard } from '@/api/board'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const list    = ref([])
const loading = ref(false)
const saving  = ref(false)
const currentPage = ref(1)
const pageSize    = ref(10)
const pagedList   = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return list.value.slice(start, start + pageSize.value)
})
const dialogVisible = ref(false)
const isEdit  = ref(false)
const formRef = ref()
const form    = ref({ name: '', status: 1 })
const rules   = { name: [{ required: true, message: '请输入名称' }] }

async function load() {
  loading.value = true
  try {
    const res = await listBoards()
    list.value = res?.list ?? res ?? []
  } finally { loading.value = false }
}

function openAdd() {
  isEdit.value = false
  form.value = { name: '', status: 1 }
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    isEdit.value ? await updateBoard(form.value.id, form.value) : await createBoard(form.value)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load()
  } finally { saving.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除控制板「${row.name}」？`, '删除确认', { type: 'warning' })
  await deleteBoard(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.pagination-wrap { display: flex; justify-content: flex-end; padding: 12px 0 4px; }
</style>
