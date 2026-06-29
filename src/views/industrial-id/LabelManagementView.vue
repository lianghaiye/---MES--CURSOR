<template>
  <div class="app-root">
  <div class="page-wrapper">
    <!-- ============ 列表视图 ============ -->
    <template v-if="currentView === 'list'">
      <div class="page-card">
        <div class="page-header">
          <h2>标识管理</h2>
          <small>展示注册成功的工业标识，支持模板变更、数据导出与二维码下载</small>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar filter-bar-main">
          <div class="filter-item">
            <label>批次号</label>
            <input v-model="filterBatchNo" placeholder="请输入批次号" class="form-input filter-input" />
          </div>
          <div class="filter-item">
            <label>申请单号</label>
            <input v-model="filterOrderNo" placeholder="请输入申请单号" class="form-input filter-input" />
          </div>
          <div class="filter-item">
            <label>产品名称</label>
            <input v-model="filterProduct" placeholder="请输入产品名称" class="form-input filter-input" />
          </div>
          <div class="filter-item">
            <label>二维码绑定状态</label>
            <select v-model="filterQrStatus" class="form-input filter-select">
              <option value="">全部</option>
              <option value="待绑定">待绑定</option>
              <option value="已绑定">已绑定</option>
            </select>
          </div>
          <div class="filter-item filter-date-range">
            <label>注册时间</label>
            <div class="date-range">
              <input type="date" v-model="filterDateStart" class="form-input filter-date" />
              <span class="date-sep">~</span>
              <input type="date" v-model="filterDateEnd" class="form-input filter-date" />
            </div>
          </div>
          <div class="filter-item filter-actions">
            <label>&nbsp;</label>
            <div class="filter-btns">
              <button class="btn btn-primary btn-sm" @click="searchLabels">查询</button>
              <button class="btn btn-default btn-sm" @click="resetFilters">重置</button>
            </div>
          </div>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <button
              class="btn btn-default"
              :disabled="batchSelectedIds.length === 0 || !canBatchChangeTemplate"
              @click="openChangeTemplateModal"
            >变更信息更新模板</button>
            <button
              class="btn btn-default"
              :disabled="batchSelectedIds.length === 0"
              @click="openBatchExportModal"
            >批量导出标识</button>
            <button
              class="btn btn-default"
              :disabled="batchSelectedIds.length === 0 || batchSelectedIds.length > 200"
              @click="openBatchDownloadModal"
            >下载二维码</button>
          </div>
          <div class="toolbar-right">
            <span class="selected-count" v-if="batchSelectedIds.length > 0">已选 {{ batchSelectedIds.length }} 条</span>
          </div>
        </div>

        <!-- 数据表格 -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th width="45">
                  <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" />
                </th>
                <th width="160">标识码</th>
                <th width="90">二维码状态</th>
                <th width="160">关联申请单号</th>
                <th width="150">产品信息更新模板</th>
                <th width="80">标识状态</th>
                <th width="100">注册时间</th>
                <th width="200" class="sticky-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="label in filteredLabels" :key="label.id">
                <td>
                  <input type="checkbox" :checked="batchSelectedIds.includes(label.id)" @change="toggleRow(label.id)" />
                </td>
                <td><a class="code-link" @click="viewDetail(label)">{{ label.labelCode }}</a></td>
                <td>
                  <span class="status-tag" :class="label.qrStatus === '已绑定' ? 'status-bound' : 'status-unbound'">
                    {{ label.qrStatus }}
                  </span>
                </td>
                <td>
                  <a class="code-link" @click="goToRequestDetail(label.requestOrderNo)">{{ label.requestOrderNo }}</a>
                </td>
                <td>{{ label.templateName }}</td>
                <td><span class="status-tag status-success">已注册</span></td>
                <td>{{ label.regTime }}</td>
                <td class="action-cell sticky-col">
                  <a class="action-link" @click="openChangeTemplateModalForSingle(label)">更新绑定信息</a>
                  <a class="action-link" @click="downloadSingleQr(label)">下载二维码</a>
                  <a class="action-link" @click="exportSingle(label)">导出标识</a>
                </td>
              </tr>
              <tr v-if="filteredLabels.length === 0">
                <td colspan="8" class="empty-hint">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="page-info">共 {{ filteredLabels.length }} 条</span>
        </div>
      </div>
    </template>

    <!-- ============ 详情视图 ============ -->
    <template v-if="currentView === 'detail'">
      <div class="page-card">
        <div class="page-header">
          <h2>标识管理</h2>
          <small>展示注册成功的工业标识，支持模板变更、数据导出与二维码下载</small>
        </div>

        <div class="detail-header">
          <button class="btn btn-default" @click="currentView = 'list'">← 返回列表</button>
          <h3 class="detail-title">标识详情 — {{ detailLabel ? detailLabel.labelCode : '' }}</h3>
        </div>

        <div class="detail-content" v-if="detailLabel">
          <!-- 基本信息 -->
          <div class="detail-section-title">基本信息</div>
          <div class="detail-list">
            <div class="detail-row">
              <span class="d-label">标识码</span><span class="d-value">{{ detailLabel.labelCode }}</span>
              <span class="d-label">二维码状态</span><span class="d-value"><span class="status-tag" :class="detailLabel.qrStatus === '已绑定' ? 'status-bound' : 'status-unbound'">{{ detailLabel.qrStatus }}</span></span>
            </div>
            <div class="detail-row">
              <span class="d-label">关联申请单号</span><span class="d-value"><a class="code-link" @click="goToRequestDetail(detailLabel.requestOrderNo)">{{ detailLabel.requestOrderNo }}</a></span>
              <span class="d-label">标识状态</span><span class="d-value"><span class="status-tag status-success">已注册</span></span>
            </div>
            <div class="detail-row">
              <span class="d-label">产品名称</span><span class="d-value">{{ detailLabel.productName }}</span>
              <span class="d-label">批次号</span><span class="d-value">{{ detailLabel.batchNo }}</span>
            </div>
            <div class="detail-row">
              <span class="d-label">规格型号</span><span class="d-value">{{ detailLabel.spec }}</span>
              <span class="d-label">注册时间</span><span class="d-value">{{ detailLabel.regTime }}</span>
            </div>
          </div>

          <!-- 标签页 -->
          <div class="detail-tabs">
            <button
              :class="['detail-tab', { active: detailTab === 'template' }]"
              @click="detailTab = 'template'"
            >产品信息更新</button>
            <button
              :class="['detail-tab', { active: detailTab === 'qrcode' }]"
              @click="detailTab = 'qrcode'"
            >二维码信息</button>
            <button
              :class="['detail-tab', { active: detailTab === 'log' }]"
              @click="detailTab = 'log'"
            >操作日志</button>
          </div>

          <!-- Tab 1: 产品信息更新 -->
          <div v-if="detailTab === 'template'" class="tab-content">
            <div class="tab-section-header">
              <span class="tab-section-title">当前关联模板：{{ detailLabel.templateName }}</span>
              <button
                class="btn btn-default btn-sm"
                :disabled="detailLabel.qrStatus === '已绑定'"
                @click="openChangeTemplateModalForSingle(detailLabel)"
              >变更信息更新模板</button>
            </div>
            <div class="table-wrap" style="padding: 0; margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>字段编码</th>
                    <th>字段名称</th>
                    <th>字段类型</th>
                    <th>是否必填</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(f, i) in currentTemplateFields" :key="i">
                    <td>{{ f.code }}</td>
                    <td>{{ f.name }}</td>
                    <td>{{ f.type }}</td>
                    <td>{{ f.required ? '是' : '否' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="detailLabel.qrStatus === '已绑定'" class="inline-hint">
              该标识已绑定产品，不支持变更信息更新模板。
            </div>
          </div>

          <!-- Tab 2: 二维码信息 -->
          <div v-if="detailTab === 'qrcode'" class="tab-content">
            <div class="qrcode-display">
              <div class="qrcode-img">
                <svg viewBox="0 0 100 100" width="150" height="150" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#fff" width="100" height="100"/>
                  <rect fill="#000" x="10" y="10" width="30" height="30" rx="3"/>
                  <rect fill="#fff" x="15" y="15" width="20" height="20" rx="2"/>
                  <rect fill="#000" x="60" y="10" width="30" height="30" rx="3"/>
                  <rect fill="#fff" x="65" y="15" width="20" height="20" rx="2"/>
                  <rect fill="#000" x="10" y="60" width="30" height="30" rx="3"/>
                  <rect fill="#fff" x="15" y="65" width="20" height="20" rx="2"/>
                  <rect fill="#000" x="48" y="48" width="4" height="4"/>
                  <rect fill="#000" x="42" y="42" width="4" height="4"/>
                  <rect fill="#000" x="54" y="54" width="4" height="4"/>
                  <rect fill="#000" x="54" y="42" width="4" height="4"/>
                  <rect fill="#000" x="42" y="54" width="4" height="4"/>
                  <rect fill="#000" x="48" y="52" width="4" height="4"/>
                  <rect fill="#000" x="52" y="48" width="4" height="4"/>
                </svg>
              </div>
              <div class="qrcode-meta">
                <div class="qrcode-code">{{ detailLabel.labelCode }}</div>
                <div class="qrcode-hint">PNG 透明背景 · 50×50px · QR Code M级容错</div>
                <button class="btn btn-primary btn-sm" @click="downloadSingleQr(detailLabel)">下载二维码</button>
              </div>
            </div>
          </div>

          <!-- Tab 3: 操作日志 -->
          <div v-if="detailTab === 'log'" class="tab-content">
            <div class="table-wrap" style="padding: 0;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>操作类型</th>
                    <th>操作详情</th>
                    <th>操作人</th>
                    <th>操作时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(log, i) in detailLabel.operationLogs" :key="i">
                    <td><span class="log-type-tag">{{ log.type }}</span></td>
                    <td>{{ log.detail }}</td>
                    <td>{{ log.operator }}</td>
                    <td>{{ log.time }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 变更信息更新模板弹窗 ============ -->
    <div v-if="changeTemplateModalVisible" class="modal-overlay" @click.self="closeChangeTemplateModal">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h3>变更信息更新模板</h3>
          <button class="btn-close" @click="closeChangeTemplateModal">✕</button>
        </div>
        <div class="modal-body">
          <!-- 已选标识列表 -->
          <div class="change-table-wrap">
            <table class="data-table mini">
              <thead>
                <tr>
                  <th>标识码</th>
                  <th>产品名称</th>
                  <th>规格型号</th>
                  <th>批次号</th>
                  <th>当前信息模板名称</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="label in selectedLabelsForChange" :key="label.id">
                  <td>{{ label.labelCode }}</td>
                  <td>{{ label.productName }}</td>
                  <td>{{ label.spec }}</td>
                  <td>{{ label.batchNo }}</td>
                  <td>{{ label.templateName }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 替换模板 -->
          <div class="form-row" style="margin-top: 20px;">
            <span class="form-label required">替换模板</span>
            <select v-model="changeTemplateForm.newTemplate" class="form-input" style="width: auto; min-width: 300px;">
              <option value="">请选择模板</option>
              <option v-for="t in availableTemplates" :key="t.code" :value="t.code">{{ t.name }}（{{ t.code }}）</option>
            </select>
          </div>

          <!-- 变更原由 -->
          <div class="form-row">
            <span class="form-label">变更原由</span>
            <textarea v-model="changeTemplateForm.reason" class="form-input form-textarea" placeholder="选填，上限100字" maxlength="100"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeChangeTemplateModal">取消</button>
          <button class="btn btn-primary" @click="confirmChangeTemplate">确认变更</button>
        </div>
      </div>
    </div>

    <!-- ============ 批量导出标识弹窗 ============ -->
    <div v-if="exportModalVisible" class="modal-overlay" @click.self="closeExportModal">
      <div class="modal-card modal-md">
        <div class="modal-header">
          <h3>导出标识信息</h3>
          <button class="btn-close" @click="closeExportModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="export-info">
            <div class="export-info-item">
              <span class="export-label">导出范围</span>
              <span class="export-value">已选择的标识记录 <strong>{{ batchSelectedIds.length }}</strong> 条</span>
            </div>
            <div class="export-info-item">
              <span class="export-label">导出格式</span>
              <span class="export-value">EXCEL（.xlsx）</span>
            </div>
          </div>
          <div class="export-fields-section">
            <div class="export-fields-title">导出字段</div>
            <label class="export-check"><input type="checkbox" v-model="exportFields.basic" disabled checked /> 标识基础信息（必选）</label>
            <label class="export-check"><input type="checkbox" v-model="exportFields.qrcode" /> 二维码</label>
            <label class="export-check"><input type="checkbox" v-model="exportFields.template" /> 产品更新模板信息</label>
          </div>
          <div class="export-name-hint">
            导出文件名：标识信息导出_{{ exportDateStr }}_01.xlsx
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeExportModal">取消</button>
          <button class="btn btn-primary" @click="doExport">确认导出</button>
        </div>
      </div>
    </div>

    <!-- ============ 批量下载二维码弹窗 ============ -->
    <div v-if="downloadModalVisible" class="modal-overlay" @click.self="closeDownloadModal">
      <div class="modal-card modal-md">
        <div class="modal-header">
          <h3>下载二维码</h3>
          <button class="btn-close" @click="closeDownloadModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="export-info">
            <div class="export-info-item">
              <span class="export-label">下载范围</span>
              <span class="export-value">已选择的标识记录 <strong>{{ batchSelectedIds.length }}</strong> 条</span>
            </div>
            <div class="export-info-item">
              <span class="export-label">二维码格式</span>
              <span class="export-value">PNG 透明背景，标准 QR Code，50×50px</span>
            </div>
            <div class="export-info-item">
              <span class="export-label">打包方式</span>
              <span class="export-value">{{ batchSelectedIds.length > 1 ? 'ZIP 压缩包' : '独立 PNG 图片' }}</span>
            </div>
          </div>
          <div class="export-name-hint">
            {{ batchSelectedIds.length > 1 ? '下载文件名：二维码下载_' + exportDateStr + '_01.zip' : '单个图片命名：【标识码】_产品名称.png' }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeDownloadModal">取消</button>
          <button class="btn btn-primary" @click="doDownload">确认下载</button>
        </div>
      </div>
    </div>

    <!-- ============ 成功提示弹窗 ============ -->
    <div v-if="successModalVisible" class="modal-overlay" @click.self="closeSuccessModal">
      <div class="success-card">
        <div class="success-icon-wrap">
          <span class="success-icon">✓</span>
        </div>
        <h3 class="success-title">{{ successModalTitle }}</h3>
        <div class="success-body">{{ successModalContent }}</div>
        <div class="success-footer">
          <button class="btn btn-primary btn-pill" @click="closeSuccessModal">我知道了</button>
        </div>
      </div>
    </div>

    <!-- ============ 错误提示弹窗 ============ -->
    <div v-if="errorModalVisible" class="modal-overlay" @click.self="closeErrorModal">
      <div class="confirm-card">
        <div class="confirm-icon-wrap" style="border-color: #dc2626; background: #fff2f0;">
          <span class="confirm-icon-warn" style="color: #dc2626;">!</span>
        </div>
        <h3 class="confirm-title">{{ errorTitle }}</h3>
        <div class="confirm-body">{{ errorContent }}</div>
        <div class="confirm-footer">
          <button class="btn btn-primary btn-pill" @click="closeErrorModal">我知道了</button>
        </div>
      </div>
    </div>

  </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentView: 'list',
      detailTab: 'template',

      // --- 筛选 ---
      filterBatchNo: '',
      filterOrderNo: '',
      filterProduct: '',
      filterQrStatus: '',
      filterDateStart: '',
      filterDateEnd: '',

      // --- 批量选择 ---
      batchSelectedIds: [],

      // --- 标识列表数据 ---
      labels: [
        {
          id: 'L001',
          labelCode: 'BXBZ2025052009300001',
          qrStatus: '已绑定',
          requestOrderNo: 'GYHLBS250520001',
          templateName: '系统全局模板',
          productName: '智能水泵X1-标准型',
          batchNo: 'BATCH-2025-0520-A',
          spec: 'X1-STD-2025',
          regTime: '2025-05-20 09:31:00',
          operationLogs: [
            { type: '模板变更', detail: '模板由"系统全局模板"变更为"系统全局模板"', operator: '张三', time: '2025-05-20 09:31:00' },
            { type: '扫码绑定', detail: '小程序扫码绑定产品信息', operator: '李四', time: '2025-05-21 10:15:00' },
            { type: '二维码下载', detail: '下载标识二维码（PNG）', operator: '张三', time: '2025-05-22 14:30:00' }
          ]
        },
        {
          id: 'L002',
          labelCode: 'BXBZ2025052009300002',
          qrStatus: '待绑定',
          requestOrderNo: 'GYHLBS250520001',
          templateName: '系统全局模板',
          productName: '智能水泵X1-标准型',
          batchNo: 'BATCH-2025-0520-A',
          spec: 'X1-STD-2025',
          regTime: '2025-05-20 09:31:00',
          operationLogs: [
            { type: '模板变更', detail: '模板由"系统全局模板"变更为"系统全局模板"', operator: '张三', time: '2025-05-20 09:31:00' }
          ]
        },
        {
          id: 'L003',
          labelCode: 'BXBZ2025052100010001',
          qrStatus: '待绑定',
          requestOrderNo: 'GYHLBS250521001',
          templateName: '水泵产品模板',
          productName: '智能水泵X2-节能型',
          batchNo: 'BATCH-2025-0521-B',
          spec: 'X2-ECO-2025',
          regTime: '2025-05-21 14:16:00',
          operationLogs: [
            { type: '注册成功', detail: '标识注册成功，关联模板"水泵产品模板"', operator: '系统', time: '2025-05-21 14:16:00' }
          ]
        },
        {
          id: 'L004',
          labelCode: 'BXBZ2025052100010002',
          qrStatus: '已绑定',
          requestOrderNo: 'GYHLBS250521001',
          templateName: '水泵产品模板',
          productName: '智能水泵X2-节能型',
          batchNo: 'BATCH-2025-0521-B',
          spec: 'X2-ECO-2025',
          regTime: '2025-05-21 14:16:00',
          operationLogs: [
            { type: '注册成功', detail: '标识注册成功，关联模板"水泵产品模板"', operator: '系统', time: '2025-05-21 14:16:00' },
            { type: '扫码绑定', detail: '小程序扫码绑定产品信息', operator: '王五', time: '2025-05-21 16:00:00' }
          ]
        },
        {
          id: 'L005',
          labelCode: 'BXBZ2025052100010003',
          qrStatus: '待绑定',
          requestOrderNo: 'GYHLBS250521001',
          templateName: '传感器通用模板',
          productName: '压力传感器P10',
          batchNo: 'BATCH-2025-0521-C',
          spec: 'P10-2025',
          regTime: '2025-05-21 14:17:00',
          operationLogs: [
            { type: '注册成功', detail: '标识注册成功，关联模板"传感器通用模板"', operator: '系统', time: '2025-05-21 14:17:00' }
          ]
        },
        {
          id: 'L006',
          labelCode: 'BXBZ2025052400010001',
          qrStatus: '待绑定',
          requestOrderNo: 'GYHLBS250524001',
          templateName: '系统全局模板',
          productName: '流量计F2-高精度',
          batchNo: 'BATCH-2025-0524-F',
          spec: 'F2-PREC-2025',
          regTime: '2025-05-24 08:21:00',
          operationLogs: [
            { type: '注册成功', detail: '标识注册成功，关联模板"系统全局模板"', operator: '系统', time: '2025-05-24 08:21:00' },
            { type: '模板变更', detail: '模板由"流量计模板V1"变更为"系统全局模板"', operator: '张三', time: '2025-05-24 09:00:00' }
          ]
        }
      ],

      // --- 可用模板列表 ---
      availableTemplates: [
        { code: 'TPL-SYS-001', name: '系统全局模板' },
        { code: 'TPL-USR-001', name: '水泵产品模板' },
        { code: 'TPL-USR-002', name: '传感器通用模板' },
        { code: 'TPL-USR-003', name: '阀门产品模板' }
      ],

      // --- 模板字段映射 ---
      templateFieldsMap: {
        'TPL-SYS-001': [
          { code: 'FIELD_001', name: '产品型号', type: '文本', required: true },
          { code: 'FIELD_002', name: '出厂编码', type: '文本', required: true },
          { code: 'FIELD_003', name: '出厂日期', type: '日期', required: true }
        ],
        'TPL-USR-001': [
          { code: 'FIELD_001', name: '产品型号', type: '文本', required: true },
          { code: 'FIELD_002', name: '出厂编码', type: '文本', required: true },
          { code: 'FIELD_003', name: '出厂日期', type: '日期', required: true },
          { code: 'FIELD_004', name: '流量参数', type: '数字', required: false },
          { code: 'FIELD_005', name: '扬程', type: '数字', required: true }
        ],
        'TPL-USR-002': [
          { code: 'FIELD_001', name: '产品型号', type: '文本', required: true },
          { code: 'FIELD_002', name: '出厂编码', type: '文本', required: true },
          { code: 'FIELD_003', name: '出厂日期', type: '日期', required: true },
          { code: 'FIELD_006', name: '量程', type: '数字', required: true },
          { code: 'FIELD_007', name: '精度等级', type: '单选', required: true }
        ],
        'TPL-USR-003': [
          { code: 'FIELD_001', name: '产品型号', type: '文本', required: true },
          { code: 'FIELD_002', name: '出厂编码', type: '文本', required: true },
          { code: 'FIELD_003', name: '出厂日期', type: '日期', required: true },
          { code: 'FIELD_008', name: '口径', type: '数字', required: true },
          { code: 'FIELD_009', name: '压力等级', type: '单选', required: true }
        ]
      },

      // --- 详情 ---
      detailLabel: null,

      // --- 变更模板 ---
      changeTemplateModalVisible: false,
      changeTemplateForm: { newTemplate: '', reason: '' },
      changeTemplateTargets: [], // 存储要变更的label id列表

      // --- 导出 ---
      exportModalVisible: false,
      exportFields: { basic: true, qrcode: false, template: false },

      // --- 下载 ---
      downloadModalVisible: false,

      // --- 成功/错误 ---
      successModalVisible: false,
      successModalTitle: '',
      successModalContent: '',
      errorModalVisible: false,
      errorTitle: '',
      errorContent: ''
    };
  },

  computed: {
    filteredLabels() {
      let list = this.labels;
      if (this.filterBatchNo) {
        const kw = this.filterBatchNo.toLowerCase();
        list = list.filter(l => l.batchNo.toLowerCase().includes(kw));
      }
      if (this.filterOrderNo) {
        const kw = this.filterOrderNo.toLowerCase();
        list = list.filter(l => l.requestOrderNo.toLowerCase().includes(kw));
      }
      if (this.filterProduct) {
        const kw = this.filterProduct.toLowerCase();
        list = list.filter(l => l.productName.toLowerCase().includes(kw));
      }
      if (this.filterQrStatus) {
        list = list.filter(l => l.qrStatus === this.filterQrStatus);
      }
      if (this.filterDateStart) {
        list = list.filter(l => l.regTime >= this.filterDateStart);
      }
      if (this.filterDateEnd) {
        list = list.filter(l => l.regTime <= this.filterDateEnd + ' 23:59:59');
      }
      return list;
    },

    isAllSelected() {
      return this.filteredLabels.length > 0 &&
        this.filteredLabels.every(l => this.batchSelectedIds.includes(l.id));
    },

    canBatchChangeTemplate() {
      if (this.batchSelectedIds.length === 0) return false;
      if (this.batchSelectedIds.length > 200) return false;
      // 不能包含已绑定的
      const hasBound = this.labels.some(
        l => this.batchSelectedIds.includes(l.id) && l.qrStatus === '已绑定'
      );
      return !hasBound;
    },

    selectedLabelsForChange() {
      return this.labels.filter(l => this.changeTemplateTargets.includes(l.id));
    },

    currentTemplateFields() {
      if (!this.detailLabel) return [];
      const tplCode = this.availableTemplates.find(
        t => t.name === this.detailLabel.templateName
      );
      const code = tplCode ? tplCode.code : 'TPL-SYS-001';
      return this.templateFieldsMap[code] || this.templateFieldsMap['TPL-SYS-001'];
    },

    exportDateStr() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      return pad(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate());
    }
  },

  methods: {
    // --- 筛选 ---
    searchLabels() {},
    resetFilters() {
      this.filterBatchNo = '';
      this.filterOrderNo = '';
      this.filterProduct = '';
      this.filterQrStatus = '';
      this.filterDateStart = '';
      this.filterDateEnd = '';
    },

    // --- 批量选择 ---
    toggleSelectAll(e) {
      if (e.target.checked) {
        this.batchSelectedIds = this.filteredLabels.map(l => l.id);
      } else {
        this.batchSelectedIds = [];
      }
    },
    toggleRow(id) {
      const idx = this.batchSelectedIds.indexOf(id);
      if (idx >= 0) this.batchSelectedIds.splice(idx, 1);
      else this.batchSelectedIds.push(id);
    },

    // --- 详情 ---
    viewDetail(label) {
      this.detailLabel = label;
      this.detailTab = 'template';
      this.currentView = 'detail';
    },

    goToRequestDetail(orderNo) {
      this.$router.push({
        path: '/industrial-id/label-request',
        query: orderNo ? { orderNo } : {},
      });
    },

    // --- 变更模板 ---
    openChangeTemplateModal() {
      if (this.batchSelectedIds.length > 200) {
        this.showError('超出限制', '单次批量变更数量不可超过 200 条，请重新选择。');
        return;
      }
      const hasBound = this.labels.some(
        l => this.batchSelectedIds.includes(l.id) && l.qrStatus === '已绑定'
      );
      if (hasBound) {
        this.showError('校验不通过', '所选标识中包含已绑定产品的标识，不支持变更信息更新模板，请重新勾选。');
        return;
      }
      this.changeTemplateTargets = [...this.batchSelectedIds];
      this.changeTemplateForm = { newTemplate: '', reason: '' };
      this.changeTemplateModalVisible = true;
    },

    openChangeTemplateModalForSingle(label) {
      if (label.qrStatus === '已绑定') {
        this.showError('不支持变更', '该标识已绑定产品，不支持变更信息更新模板。');
        return;
      }
      this.changeTemplateTargets = [label.id];
      this.changeTemplateForm = { newTemplate: '', reason: '' };
      this.changeTemplateModalVisible = true;
    },

    closeChangeTemplateModal() {
      this.changeTemplateModalVisible = false;
      this.changeTemplateTargets = [];
    },

    confirmChangeTemplate() {
      if (!this.changeTemplateForm.newTemplate) {
        this.showError('校验不通过', '请选择替换模板。');
        return;
      }
      const newTpl = this.availableTemplates.find(t => t.code === this.changeTemplateForm.newTemplate);
      const newName = newTpl ? newTpl.name : this.changeTemplateForm.newTemplate;
      const now = this.getNow();

      this.changeTemplateTargets.forEach(id => {
        const label = this.labels.find(l => l.id === id);
        if (label) {
          const oldName = label.templateName;
          label.templateName = newName;
          label.operationLogs.push({
            type: '模板变更',
            detail: `模板由"${oldName}"变更为"${newName}"${this.changeTemplateForm.reason ? '，变更原由：' + this.changeTemplateForm.reason : ''}`,
            operator: '当前用户',
            time: now
          });
        }
      });

      this.closeChangeTemplateModal();
      this.batchSelectedIds = [];
      this.showSuccess('变更成功', `已成功变更 ${this.changeTemplateTargets.length} 条标识的信息更新模板为"${newName}"。`);
    },

    // --- 导出 ---
    openBatchExportModal() {
      if (this.batchSelectedIds.length > 200) {
        this.showError('超出限制', '为避免下载超时，单次导出数量不可超过 200 条，请分批导出。');
        return;
      }
      this.exportModalVisible = true;
      this.exportFields = { basic: true, qrcode: false, template: false };
    },
    closeExportModal() {
      this.exportModalVisible = false;
    },
    doExport() {
      this.exportModalVisible = false;
      this.showSuccess('导出成功', `已导出 ${this.batchSelectedIds.length} 条标识数据，文件：标识信息导出_${this.exportDateStr}_01.xlsx`);
    },
    exportSingle(label) {
      this.showSuccess('导出成功', `已导出标识 ${label.labelCode} 的数据，文件：标识信息导出_${this.exportDateStr}_01.xlsx`);
    },

    // --- 下载二维码 ---
    openBatchDownloadModal() {
      if (this.batchSelectedIds.length > 200) {
        this.showError('超出限制', '为避免下载超时，单次下载数量不可超过 200 条，请分批下载。');
        return;
      }
      this.downloadModalVisible = true;
    },
    closeDownloadModal() {
      this.downloadModalVisible = false;
    },
    doDownload() {
      this.downloadModalVisible = false;
      const msg = this.batchSelectedIds.length > 1
        ? `已打包 ${this.batchSelectedIds.length} 条二维码图片，文件：二维码下载_${this.exportDateStr}_01.zip`
        : '已下载二维码图片：【标识码】_产品名称.png';
      this.showSuccess('下载成功', msg);
    },
    downloadSingleQr(label) {
      this.showSuccess('下载成功', `已下载二维码图片：${label.labelCode}_${label.productName}.png`);
    },

    // --- 提示弹窗 ---
    showSuccess(title, content) {
      this.successModalTitle = title;
      this.successModalContent = content;
      this.successModalVisible = true;
    },
    closeSuccessModal() { this.successModalVisible = false; },
    showError(title, content) {
      this.errorTitle = title;
      this.errorContent = content;
      this.errorModalVisible = true;
    },
    closeErrorModal() { this.errorModalVisible = false; },

    getNow() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }
};
</script>

<style scoped>
/* ---- 通用 ---- */
.page-wrapper { height: 100%; }
.page-card { background: #fff; border-radius: 8px; }
.page-header { padding: 24px 24px 0; }
.page-header h2 { font-size: 18px; color: #1f2937; margin-bottom: 4px; }
.page-header small { color: #6b7280; font-size: 13px; }

/* ---- 筛选栏 ---- */
.filter-bar-main {
  display: flex; gap: 16px; align-items: flex-end;
  padding: 16px 24px; flex-wrap: wrap;
}
.filter-item label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.filter-select { width: 130px; }
.filter-input { width: 140px; }
.filter-date { width: 130px; }
.date-range { display: flex; align-items: center; gap: 6px; }
.date-sep { color: #9ca3af; font-size: 13px; }
.filter-btns { display: flex; gap: 8px; }

/* ---- 工具栏 ---- */
.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24px 16px;
}
.toolbar-left { display: flex; gap: 8px; }
.toolbar-right { display: flex; align-items: center; }
.selected-count { font-size: 13px; color: #1890ff; font-weight: 500; }

/* ---- 按钮 ---- */
.btn {
  padding: 8px 16px; border-radius: 4px; font-size: 13px;
  cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
}
.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
.btn-primary:hover { background: #096dd9; }
.btn-default { background: #fff; color: #374151; border-color: #d1d5db; }
.btn-default:hover { border-color: #1890ff; color: #1890ff; }
.btn-default:disabled { color: #d1d5db; cursor: not-allowed; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-close { background: none; border: none; font-size: 18px; color: #9ca3af; cursor: pointer; }
.btn-close:hover { color: #374151; }

/* ---- 表格 ---- */
.table-wrap { overflow-x: auto; padding: 0 24px 16px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td {
  padding: 10px 8px; text-align: left;
  border-bottom: 1px solid #e5e7eb; white-space: nowrap;
}
.data-table th { background: #fafafa; color: #6b7280; font-weight: 500; position: sticky; top: 0; }
.data-table.mini { font-size: 12px; }
.data-table.mini th, .data-table.mini td { padding: 6px 8px; }

/* ---- 标签 ---- */
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
.status-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.status-bound { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.status-unbound { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }

/* ---- 操作列 ---- */
.action-cell { white-space: nowrap; }
.action-link { color: #1890ff; cursor: pointer; margin-right: 8px; font-size: 13px; text-decoration: none; }
.action-link:hover { color: #096dd9; }
.code-link { color: #1890ff; cursor: pointer; text-decoration: underline; }
.code-link:hover { color: #096dd9; }

/* ---- sticky ---- */
.data-table th.sticky-col,
.data-table td.sticky-col {
  position: sticky; right: 0; background: #fff;
  z-index: 1; box-shadow: -2px 0 4px rgba(0,0,0,0.06);
}
.data-table th.sticky-col { z-index: 2; background: #fafafa; }

/* ---- 分页 ---- */
.pagination { padding: 12px 24px; text-align: right; }
.page-info { font-size: 13px; color: #6b7280; }
.empty-hint { text-align: center; color: #9ca3af; font-size: 13px; padding: 24px; }

/* ---- 弹窗通用 ---- */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; animation: fadeIn 0.2s ease;
}
.modal-card {
  background: #fff; border-radius: 8px; max-height: 85vh;
  display: flex; flex-direction: column; animation: slideUp 0.3s ease;
}
.modal-lg { width: 800px; }
.modal-md { width: 520px; }
.modal-sm { width: 420px; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px; border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; }
.modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.modal-footer {
  display: flex; justify-content: flex-end; align-items: center;
  gap: 12px; padding: 12px 24px; border-top: 1px solid #e5e7eb;
}

/* ---- 确认弹窗 ---- */
.confirm-card {
  background: #fff; border-radius: 12px; width: 400px;
  padding: 32px 32px 24px; text-align: center;
  animation: slideUp 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.confirm-icon-wrap {
  width: 52px; height: 52px; border-radius: 50%;
  margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;
}
.confirm-icon-warn { font-size: 28px; font-weight: 700; line-height: 1; }
.confirm-title { font-size: 17px; font-weight: 600; color: #1f2937; margin: 0 0 12px; }
.confirm-body { font-size: 14px; color: #6b7280; line-height: 1.8; margin: 0 0 24px; }
.confirm-footer { display: flex; justify-content: center; gap: 16px; }
.btn-pill {
  min-width: 100px; padding: 8px 24px; border-radius: 20px;
  font-size: 14px; border: none; cursor: pointer; transition: all 0.2s;
}
.btn-default.btn-pill { background: #f5f5f5; color: #6b7280; border: 1px solid #d1d5db; }
.btn-default.btn-pill:hover { background: #e5e7eb; }
.btn-primary.btn-pill { background: #1890ff; color: #fff; }
.btn-primary.btn-pill:hover { background: #096dd9; }

/* ---- 成功弹窗 ---- */
.success-card {
  background: #fff; border-radius: 12px; width: 400px;
  padding: 32px 32px 24px; text-align: center;
  animation: slideUp 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}
.success-icon-wrap {
  width: 52px; height: 52px; border-radius: 50%;
  margin: 0 auto 16px; background: #f6ffed; border: 3px solid #52c41a;
  display: flex; align-items: center; justify-content: center;
}
.success-icon { font-size: 28px; font-weight: 700; color: #52c41a; line-height: 1; }
.success-title { font-size: 17px; font-weight: 600; color: #1f2937; margin: 0 0 12px; }
.success-body { font-size: 14px; color: #6b7280; line-height: 1.8; margin: 0 0 24px; }
.success-footer { display: flex; justify-content: center; }

/* ---- 表单通用 ---- */
.form-input {
  padding: 7px 10px; border: 1px solid #d1d5db;
  border-radius: 4px; font-size: 13px; color: #1f2937;
  width: 100%; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #1890ff; box-shadow: 0 0 0 2px rgba(24,144,255,0.1); }
.form-textarea { height: 80px; resize: vertical; font-family: inherit; }
.form-row { margin-bottom: 16px; display: flex; align-items: flex-start; }
.form-label { width: 90px; flex-shrink: 0; padding-top: 7px; font-size: 13px; color: #374151; }
.form-label.required::before { content: '*'; color: #dc2626; margin-right: 4px; }

/* ---- 变更模板弹窗 ---- */
.change-table-wrap { max-height: 200px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 4px; }

/* ---- 导出弹窗 ---- */
.export-info { margin-bottom: 20px; }
.export-info-item { display: flex; margin-bottom: 10px; }
.export-label { width: 80px; flex-shrink: 0; font-size: 13px; color: #6b7280; }
.export-value { font-size: 13px; color: #1f2937; }
.export-value strong { color: #1890ff; }
.export-fields-section { margin-bottom: 16px; }
.export-fields-title { font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.export-check { display: block; font-size: 13px; color: #374151; margin-bottom: 6px; }
.export-check input { margin-right: 6px; accent-color: #1890ff; }
.export-name-hint { font-size: 12px; color: #9ca3af; margin-top: 8px; }

/* ---- 详情页 ---- */
.detail-header {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 24px; border-bottom: 1px solid #e5e7eb;
}
.detail-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; }
.detail-content { padding: 24px; }
.detail-list { margin-bottom: 16px; }
.detail-row { display: flex; align-items: center; gap: 24px; margin-bottom: 12px; flex-wrap: wrap; }
.d-label { font-size: 13px; color: #6b7280; width: 80px; flex-shrink: 0; }
.d-value { font-size: 13px; color: #1f2937; }
.detail-section-title {
  font-size: 15px; font-weight: 600; color: #1f2937;
  margin: 0 0 12px; padding-left: 10px; border-left: 3px solid #1890ff;
}

/* ---- 标签页 ---- */
.detail-tabs {
  display: flex; gap: 0;
  margin-top: 24px; border-bottom: 1px solid #e5e7eb;
}
.detail-tab {
  padding: 10px 24px; font-size: 14px; color: #6b7280;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; margin-bottom: -1px; transition: all 0.2s;
}
.detail-tab:hover { color: #1890ff; }
.detail-tab.active { color: #1890ff; border-bottom-color: #1890ff; font-weight: 500; }
.tab-content { padding-top: 20px; }
.tab-section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.tab-section-title { font-size: 14px; color: #374151; font-weight: 500; }
.inline-hint { font-size: 13px; color: #ff9800; margin-top: 12px; padding: 8px 12px; background: #fff7e6; border-radius: 4px; }

/* ---- 二维码展示 ---- */
.qrcode-display { display: flex; align-items: center; gap: 32px; }
.qrcode-img { flex-shrink: 0; }
.qrcode-meta { display: flex; flex-direction: column; gap: 12px; }
.qrcode-code { font-size: 16px; font-weight: 600; color: #1f2937; font-family: monospace; }
.qrcode-hint { font-size: 12px; color: #9ca3af; }

/* ---- 操作日志 ---- */
.log-type-tag {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  font-size: 12px; background: #f0f5ff; color: #2f54eb;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
