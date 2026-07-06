<template>
  <div class="app-root">
    <div class="page-wrapper">
      <!-- ============ 列表视图 ============ -->
      <template v-if="currentView === 'list'">
        <div class="page-card">
          <div class="page-header">
            <h2>标识申请</h2>
            <small>创建与管理标识申请单，支持提交注册、导出标识数据及下载二维码</small>
          </div>
          <!-- 筛选栏 -->
          <div class="filter-bar filter-bar-main">
            <div class="filter-item">
              <label>申请状态</label>
              <select v-model="filterStatus" class="form-input filter-select">
                <option value="">全部</option>
                <option value="待提交">待提交</option>
                <option value="处理中">处理中</option>
                <option value="全部成功">全部成功</option>
                <option value="部分成功">部分成功</option>
                <option value="全部失败">全部失败</option>
              </select>
            </div>
            <div class="filter-item">
              <label>产品名称</label>
              <input
                v-model="filterProduct"
                placeholder="请输入产品名称"
                class="form-input filter-input"
              />
            </div>
            <div class="filter-item">
              <label>批次号</label>
              <input
                v-model="filterBatchNo"
                placeholder="请输入批次号"
                class="form-input filter-input"
              />
            </div>
            <div class="filter-item filter-date-range">
              <label>申请时间</label>
              <div class="date-range">
                <input type="date" v-model="filterDateStart" class="form-input filter-date" />
                <span class="date-sep">~</span>
                <input type="date" v-model="filterDateEnd" class="form-input filter-date" />
              </div>
            </div>
            <div class="filter-item filter-actions">
              <label>&nbsp;</label>
              <div class="filter-btns">
                <button class="btn btn-primary btn-sm" @click="searchApplications">查询</button>
                <button class="btn btn-default btn-sm" @click="resetFilters">重置</button>
              </div>
            </div>
          </div>

          <!-- 新增按钮 -->
          <div class="toolbar">
            <div class="toolbar-left">
              <button class="btn btn-primary" @click="openNewApplication">+ 新增申请</button>
            </div>
          </div>

          <!-- 数据表格 -->
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="90">申请状态</th>
                  <th width="160">申请单号</th>
                  <th width="150">产品名称</th>
                  <th width="80">产品数量</th>
                  <th width="150">批次号</th>
                  <th width="90">总申请数量</th>
                  <th width="80">成功数量</th>
                  <th width="80">失败数量</th>
                  <th width="160">申请备注</th>
                  <th width="200" class="sticky-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="app in filteredApplications" :key="app.id">
                  <td>
                    <span class="status-tag" :class="statusClass(app.status)">
                      {{ app.status }}
                    </span>
                  </td>
                  <td>
                    <a class="code-link" @click="viewApplicationDetail(app)">{{ app.orderNo }}</a>
                  </td>
                  <td>
                    <span class="cell-text" :title="app.productNames">{{
                      app.productNames.length > 28
                        ? app.productNames.slice(0, 28) + '...'
                        : app.productNames
                    }}</span>
                  </td>
                  <td>{{ app.productCount }}</td>
                  <td>
                    <span class="cell-text" :title="app.batchNos">{{
                      app.batchNos.length > 28 ? app.batchNos.slice(0, 28) + '...' : app.batchNos
                    }}</span>
                  </td>
                  <td>{{ app.totalCount }}</td>
                  <td>{{ app.successCount }}</td>
                  <td>{{ app.failCount }}</td>
                  <td>
                    <span class="cell-text" :title="app.remark">{{
                      app.remark.length > 20 ? app.remark.slice(0, 20) + '...' : app.remark
                    }}</span>
                  </td>
                  <td class="action-cell sticky-col">
                    <!-- 待提交 -->
                    <template v-if="app.status === '待提交'">
                      <a class="action-link" @click="submitApplication(app)">申请标识</a>
                    </template>
                    <!-- 处理中：无操作 -->
                    <template v-else-if="app.status === '处理中'">
                      <span class="action-none">—</span>
                    </template>
                    <!-- 全部成功 -->
                    <template v-else-if="app.status === '全部成功'">
                      <a class="action-link" @click="openExportModal(app)">导出标识</a>
                      <a class="action-link" @click="openDownloadModal(app)">下载二维码</a>
                    </template>
                    <!-- 部分成功 -->
                    <template v-else-if="app.status === '部分成功'">
                      <a class="action-link warn" @click="confirmResubmit(app)">重新提交</a>
                      <a class="action-link" @click="openExportModal(app)">导出标识</a>
                      <a class="action-link" @click="openDownloadModal(app)">下载二维码</a>
                    </template>
                    <!-- 全部失败 -->
                    <template v-else-if="app.status === '全部失败'">
                      <a class="action-link warn" @click="confirmResubmit(app)">重新提交</a>
                    </template>
                  </td>
                </tr>
                <tr v-if="filteredApplications.length === 0">
                  <td colspan="10" class="empty-hint">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination">
            <span class="page-info">共 {{ filteredApplications.length }} 条</span>
          </div>
        </div>
      </template>

      <!-- ============ 新增申请视图 ============ -->
      <template v-if="currentView === 'new'">
        <div class="page-card">
          <div class="page-header">
            <h2>标识申请</h2>
            <small>创建与管理标识申请单，支持提交注册、导出标识数据及下载二维码</small>
          </div>

          <div class="detail-header">
            <button class="btn btn-default" @click="cancelNewApplication">← 返回列表</button>
            <h3 class="detail-title">新增申请</h3>
          </div>

          <div class="new-app-content">
            <!-- 申请备注 -->
            <div class="form-row">
              <span class="form-label">申请备注</span>
              <textarea
                v-model="newAppForm.remark"
                class="form-input form-textarea"
                placeholder="选填，记录申请相关说明，上限500字"
                maxlength="500"
              ></textarea>
            </div>

            <!-- 产品明细表格 -->
            <div class="section-title">产品明细</div>
            <div class="table-wrap" style="padding: 0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="200">产品名称</th>
                    <th width="200">批次号</th>
                    <th width="120">数量</th>
                    <th width="80">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in newAppForm.products" :key="idx">
                    <td>
                      <div class="product-search-cell">
                        <input
                          v-model="row.productName"
                          class="form-input product-search-input"
                          placeholder="请搜索并选择产品"
                          @focus="openProductSearch(idx)"
                          @input="filterProductSearch(idx)"
                          autocomplete="off"
                        />
                        <div
                          v-if="row.showDropdown && row.searchResults.length > 0"
                          class="product-dropdown"
                        >
                          <div
                            v-for="(p, pi) in row.searchResults"
                            :key="pi"
                            class="product-dropdown-item"
                            @click="selectProduct(idx, p)"
                          >
                            {{ p }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <input v-model="row.batchNo" class="form-input" placeholder="请输入批次号" />
                    </td>
                    <td>
                      <input
                        v-model.number="row.quantity"
                        type="number"
                        class="form-input"
                        placeholder="正整数"
                        min="1"
                        style="width: 100px"
                      />
                    </td>
                    <td>
                      <a
                        v-if="newAppForm.products.length > 1"
                        class="action-link danger"
                        @click="removeProductRow(idx)"
                        >删除</a
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="add-row-bar">
              <button class="btn btn-link" @click="addProductRow">+ 新增一行</button>
              <span class="total-count-hint"
                >当前总申请数量：<strong>{{ totalApplyCount }}</strong> / 200</span
              >
            </div>

            <!-- 底部按钮 -->
            <div class="new-app-footer">
              <button class="btn btn-default" @click="cancelNewApplication">取消</button>
              <button class="btn btn-primary" @click="saveApplication">保存</button>
              <button class="btn btn-primary" @click="saveAndSubmit">保存并注册</button>
            </div>
          </div>
        </div>
      </template>

      <!-- ============ 详情视图 ============ -->
      <template v-if="currentView === 'detail'">
        <div class="page-card">
          <div class="page-header">
            <h2>标识申请</h2>
            <small>创建与管理标识申请单，支持提交注册、导出标识数据及下载二维码</small>
          </div>

          <div class="detail-header">
            <button class="btn btn-default" @click="currentView = 'list'">← 返回列表</button>
            <h3 class="detail-title">申请单详情</h3>
          </div>

          <div class="detail-content" v-if="detailApplication">
            <!-- 基本信息 -->
            <div class="detail-section-title">基本信息</div>
            <div class="detail-list">
              <div class="detail-row">
                <span class="d-label">申请单号</span>
                <span class="d-value">{{ detailApplication.orderNo }}</span>
              </div>
              <div class="detail-row">
                <span class="d-label">申请状态</span>
                <span class="d-value">
                  <span class="status-tag" :class="statusClass(detailApplication.status)">{{
                    detailApplication.status
                  }}</span>
                </span>
              </div>
              <div class="detail-row">
                <span class="d-label">产品总数</span>
                <span class="d-value">{{ detailApplication.productCount }} 种</span>
              </div>
              <div class="detail-row">
                <span class="d-label">总申请数量</span>
                <span class="d-value">{{ detailApplication.totalCount }}</span>
              </div>
              <div class="detail-row">
                <span class="d-label">成功数量</span>
                <span class="d-value" style="color: #52c41a">{{
                  detailApplication.successCount
                }}</span>
              </div>
              <div class="detail-row">
                <span class="d-label">失败数量</span>
                <span class="d-value" style="color: #ff4d4f">{{
                  detailApplication.failCount
                }}</span>
              </div>
              <div class="detail-row">
                <span class="d-label">申请时间</span>
                <span class="d-value">{{ detailApplication.createTime }}</span>
              </div>
              <div class="detail-row" v-if="detailApplication.remark">
                <span class="d-label">申请备注</span>
                <span class="d-value">{{ detailApplication.remark }}</span>
              </div>
            </div>

            <!-- 产品明细 -->
            <div class="detail-section-title" style="margin-top: 24px">产品明细</div>
            <div class="table-wrap" style="padding: 0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>产品名称</th>
                    <th>批次号</th>
                    <th>申请数量</th>
                    <th>成功数量</th>
                    <th>失败数量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in detailApplication.productDetails" :key="i">
                    <td>{{ p.productName }}</td>
                    <td>{{ p.batchNo }}</td>
                    <td>{{ p.quantity }}</td>
                    <td style="color: #52c41a">{{ p.successCount }}</td>
                    <td style="color: #ff4d4f">{{ p.failCount }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 操作按钮 -->
            <div class="detail-actions">
              <template v-if="detailApplication.status === '全部成功'">
                <button class="btn btn-primary" @click="openExportModal(detailApplication)">
                  导出标识
                </button>
                <button class="btn btn-default" @click="openDownloadModal(detailApplication)">
                  下载二维码
                </button>
              </template>
              <template v-else-if="detailApplication.status === '部分成功'">
                <button class="btn btn-primary" @click="openExportModal(detailApplication)">
                  导出标识
                </button>
                <button class="btn btn-default" @click="openDownloadModal(detailApplication)">
                  下载二维码
                </button>
                <button class="btn btn-warn" @click="confirmResubmit(detailApplication)">
                  重新提交
                </button>
              </template>
              <template v-else-if="detailApplication.status === '全部失败'">
                <button class="btn btn-warn" @click="confirmResubmit(detailApplication)">
                  重新提交
                </button>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- ============ 重新提交确认弹窗 ============ -->
      <div v-if="resubmitConfirmVisible" class="modal-overlay" @click.self="cancelResubmit">
        <div class="confirm-card">
          <div class="confirm-icon-wrap">
            <span class="confirm-icon-warn">!</span>
          </div>
          <h3 class="confirm-title">重新提交</h3>
          <div class="confirm-body">
            是否确认再次提交申请？本次只对单据内<strong>申请失败</strong>的数据进行再次申请。
            <div style="margin-top: 8px; font-size: 13px; color: #9ca3af">
              失败数量：<strong style="color: #ff4d4f">{{
                resubmitTarget ? resubmitTarget.failCount : 0
              }}</strong>
              条
            </div>
          </div>
          <div class="confirm-footer">
            <button class="btn btn-default btn-pill" @click="cancelResubmit">取消</button>
            <button class="btn btn-primary btn-pill" @click="doResubmit">确认提交</button>
          </div>
        </div>
      </div>

      <!-- ============ 导出标识弹窗 ============ -->
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
                <span class="export-value"
                  >已选择的标识记录
                  <strong>{{ exportTarget ? exportTarget.successCount : 0 }}</strong>
                  条（仅成功数据）</span
                >
              </div>
              <div class="export-info-item">
                <span class="export-label">导出格式</span>
                <span class="export-value">EXCEL（.xlsx）</span>
              </div>
            </div>
            <div class="export-fields-section">
              <div class="export-fields-title">导出字段</div>
              <label class="export-check"
                ><input type="checkbox" v-model="exportFields.basic" disabled checked />
                标识基础信息（必选）</label
              >
              <label class="export-check"
                ><input type="checkbox" v-model="exportFields.qrcode" /> 二维码</label
              >
              <label class="export-check"
                ><input type="checkbox" v-model="exportFields.template" /> 产品更新模板信息</label
              >
            </div>
            <div class="export-name-hint">导出文件名：标识信息导出_{{ exportDateStr }}_01.xlsx</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" @click="closeExportModal">取消</button>
            <button class="btn btn-primary" @click="doExport">确认导出</button>
          </div>
        </div>
      </div>

      <!-- ============ 下载二维码弹窗 ============ -->
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
                <span class="export-value"
                  >已选择的标识记录
                  <strong>{{ downloadTarget ? downloadTarget.successCount : 0 }}</strong>
                  条（仅成功数据）</span
                >
              </div>
              <div class="export-info-item">
                <span class="export-label">二维码格式</span>
                <span class="export-value">PNG 透明背景，标准 QR Code，50×50px</span>
              </div>
              <div class="export-info-item">
                <span class="export-label">打包方式</span>
                <span class="export-value">{{
                  downloadTarget && downloadTarget.successCount > 1 ? 'ZIP 压缩包' : '独立 PNG 图片'
                }}</span>
              </div>
            </div>
            <div class="export-name-hint">
              {{
                downloadTarget && downloadTarget.successCount > 1
                  ? '下载文件名：二维码下载_' + exportDateStr + '_01.zip'
                  : '单个图片命名：【标识码】_产品名称.png'
              }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" @click="closeDownloadModal">取消</button>
            <button class="btn btn-primary" @click="doDownload">确认下载</button>
          </div>
        </div>
      </div>

      <!-- ============ 提交申请确认弹窗 ============ -->
      <div v-if="submitConfirmVisible" class="modal-overlay" @click.self="cancelSubmit">
        <div class="confirm-card">
          <div class="confirm-icon-wrap">
            <span class="confirm-icon-warn">!</span>
          </div>
          <h3 class="confirm-title">提交确认</h3>
          <div class="confirm-body">
            确认对申请单
            <strong>{{ submitTarget ? submitTarget.orderNo : '' }}</strong>
            发起标识注册吗？提交后将向二级节点发起标识注册请求。
          </div>
          <div class="confirm-footer">
            <button class="btn btn-default btn-pill" @click="cancelSubmit">取消</button>
            <button class="btn btn-primary btn-pill" @click="doSubmit">确认提交</button>
          </div>
        </div>
      </div>

      <!-- ============ 操作成功提示弹窗 ============ -->
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
          <div class="confirm-icon-wrap" style="border-color: #dc2626; background: #fff2f0">
            <span class="confirm-icon-warn" style="color: #dc2626">!</span>
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

      // --- 筛选 ---
      filterStatus: '',
      filterProduct: '',
      filterBatchNo: '',
      filterDateStart: '',
      filterDateEnd: '',

      // --- 申请列表 ---
      applications: [
        {
          id: 1,
          orderNo: 'GYHLBS250520001',
          status: '全部成功',
          productNames: '智能水泵X1-标准型',
          productCount: 1,
          batchNos: 'BATCH-2025-0520-A',
          totalCount: 50,
          successCount: 50,
          failCount: 0,
          remark: '第一批次标识申请',
          createTime: '2025-05-20 09:30:00',
          productDetails: [
            {
              productName: '智能水泵X1-标准型',
              batchNo: 'BATCH-2025-0520-A',
              quantity: 50,
              successCount: 50,
              failCount: 0,
            },
          ],
        },
        {
          id: 2,
          orderNo: 'GYHLBS250521001',
          status: '部分成功',
          productNames: '智能水泵X2-节能型、压力传感器P10',
          productCount: 2,
          batchNos: 'BATCH-2025-0521-B、BATCH-2025-0521-C',
          totalCount: 120,
          successCount: 85,
          failCount: 35,
          remark: '第二批多种产品标识申请，包含两款产品',
          createTime: '2025-05-21 14:15:00',
          productDetails: [
            {
              productName: '智能水泵X2-节能型',
              batchNo: 'BATCH-2025-0521-B',
              quantity: 80,
              successCount: 80,
              failCount: 0,
            },
            {
              productName: '压力传感器P10',
              batchNo: 'BATCH-2025-0521-C',
              quantity: 40,
              successCount: 5,
              failCount: 35,
            },
          ],
        },
        {
          id: 3,
          orderNo: 'GYHLBS250522001',
          status: '处理中',
          productNames: '智能阀门V3',
          productCount: 1,
          batchNos: 'BATCH-2025-0522-D',
          totalCount: 30,
          successCount: 0,
          failCount: 0,
          remark: '阀门标识第三批',
          createTime: '2025-05-22 10:00:00',
          productDetails: [
            {
              productName: '智能阀门V3',
              batchNo: 'BATCH-2025-0522-D',
              quantity: 30,
              successCount: 0,
              failCount: 0,
            },
          ],
        },
        {
          id: 4,
          orderNo: 'GYHLBS250523001',
          status: '全部失败',
          productNames: '温控传感器T5',
          productCount: 1,
          batchNos: 'BATCH-2025-0523-E',
          totalCount: 60,
          successCount: 0,
          failCount: 60,
          remark: '全部注册失败，需排查二级节点连接',
          createTime: '2025-05-23 16:45:00',
          productDetails: [
            {
              productName: '温控传感器T5',
              batchNo: 'BATCH-2025-0523-E',
              quantity: 60,
              successCount: 0,
              failCount: 60,
            },
          ],
        },
        {
          id: 5,
          orderNo: 'GYHLBS250524001',
          status: '待提交',
          productNames: '流量计F2-高精度',
          productCount: 1,
          batchNos: 'BATCH-2025-0524-F',
          totalCount: 80,
          successCount: 0,
          failCount: 0,
          remark: '新批次标识申请，尚未提交',
          createTime: '2025-05-24 08:20:00',
          productDetails: [
            {
              productName: '流量计F2-高精度',
              batchNo: 'BATCH-2025-0524-F',
              quantity: 80,
              successCount: 0,
              failCount: 0,
            },
          ],
        },
      ],

      // --- 新增表单 ---
      newAppForm: {
        remark: '',
        products: [
          { productName: '', batchNo: '', quantity: 1, showDropdown: false, searchResults: [] },
        ],
      },

      // --- 产品库（搜索用） ---
      productLibrary: [
        '智能水泵X1-标准型',
        '智能水泵X2-节能型',
        '智能水泵X3-工业型',
        '压力传感器P10',
        '压力传感器P20',
        '智能阀门V3',
        '智能阀门V5',
        '温控传感器T5',
        '流量计F2-高精度',
        '液位传感器L8',
        '振动传感器Z12',
      ],

      // --- 详情 ---
      detailApplication: null,

      // --- 提交确认 ---
      submitConfirmVisible: false,
      submitTarget: null,

      // --- 重新提交 ---
      resubmitConfirmVisible: false,
      resubmitTarget: null,

      // --- 导出 ---
      exportModalVisible: false,
      exportTarget: null,
      exportFields: { basic: true, qrcode: false, template: false },

      // --- 下载 ---
      downloadModalVisible: false,
      downloadTarget: null,

      // --- 成功/错误提示 ---
      successModalVisible: false,
      successModalTitle: '',
      successModalContent: '',
      errorModalVisible: false,
      errorTitle: '',
      errorContent: '',

      // --- 流水号 ---
      serialCounter: 5,
    }
  },

  computed: {
    filteredApplications() {
      let list = this.applications
      if (this.filterStatus) {
        list = list.filter((a) => a.status === this.filterStatus)
      }
      if (this.filterProduct) {
        const kw = this.filterProduct.toLowerCase()
        list = list.filter((a) => a.productNames.toLowerCase().includes(kw))
      }
      if (this.filterBatchNo) {
        const kw = this.filterBatchNo.toLowerCase()
        list = list.filter((a) => a.batchNos.toLowerCase().includes(kw))
      }
      if (this.filterDateStart) {
        list = list.filter((a) => a.createTime >= this.filterDateStart)
      }
      if (this.filterDateEnd) {
        list = list.filter((a) => a.createTime <= this.filterDateEnd + ' 23:59:59')
      }
      return list
    },

    totalApplyCount() {
      return this.newAppForm.products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)
    },

    exportDateStr() {
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      return pad(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate())
    },
  },

  methods: {
    // --- 状态样式 ---
    statusClass(status) {
      switch (status) {
        case '全部成功':
          return 'status-success'
        case '部分成功':
          return 'status-partial'
        case '全部失败':
          return 'status-fail'
        case '待提交':
          return 'status-pending'
        case '处理中':
          return 'status-processing'
        default:
          return ''
      }
    },

    // --- 筛选 ---
    searchApplications() {},
    resetFilters() {
      this.filterStatus = ''
      this.filterProduct = ''
      this.filterBatchNo = ''
      this.filterDateStart = ''
      this.filterDateEnd = ''
    },

    // --- 列表操作 ---
    openNewApplication() {
      this.currentView = 'new'
      this.newAppForm = {
        remark: '',
        products: [
          { productName: '', batchNo: '', quantity: 1, showDropdown: false, searchResults: [] },
        ],
      }
    },

    cancelNewApplication() {
      this.currentView = 'list'
    },

    viewApplicationDetail(app) {
      this.detailApplication = app
      this.currentView = 'detail'
    },

    // --- 提交申请 ---
    submitApplication(app) {
      this.submitTarget = app
      this.submitConfirmVisible = true
    },
    cancelSubmit() {
      this.submitConfirmVisible = false
      this.submitTarget = null
    },
    doSubmit() {
      if (this.submitTarget) {
        this.submitTarget.status = '处理中'
      }
      this.submitConfirmVisible = false
      this.submitTarget = null
      this.showSuccess('提交成功', '申请单已提交注册，后台正在异步处理，请稍后查看结果。')
    },

    // --- 重新提交 ---
    confirmResubmit(app) {
      this.resubmitTarget = app
      this.resubmitConfirmVisible = true
    },
    cancelResubmit() {
      this.resubmitConfirmVisible = false
      this.resubmitTarget = null
    },
    doResubmit() {
      if (this.resubmitTarget) {
        // 模拟：将所有失败数据状态更新为处理中
        if (this.resubmitTarget.productDetails) {
          this.resubmitTarget.productDetails.forEach((p) => {
            if (p.failCount > 0) {
              p.successCount += p.failCount
              p.failCount = 0
            }
          })
        }
        // 重新计算
        this.recalcAppCounts(this.resubmitTarget)
      }
      this.resubmitConfirmVisible = false
      this.resubmitTarget = null
      this.showSuccess('重新提交成功', '失败数据已重新提交注册，后台正在处理中。')
    },

    recalcAppCounts(app) {
      if (!app.productDetails) return
      let total = 0,
        success = 0,
        fail = 0
      app.productDetails.forEach((p) => {
        total += p.quantity
        success += p.successCount
        fail += p.failCount
      })
      app.totalCount = total
      app.successCount = success
      app.failCount = fail
      if (success === total) app.status = '全部成功'
      else if (fail === total) app.status = '全部失败'
      else if (success > 0) app.status = '部分成功'
      else app.status = '处理中'
    },

    // --- 导出 ---
    openExportModal(app) {
      this.exportTarget = app
      this.exportFields = { basic: true, qrcode: false, template: false }
      this.exportModalVisible = true
    },
    closeExportModal() {
      this.exportModalVisible = false
      this.exportTarget = null
    },
    doExport() {
      const count = this.exportTarget ? this.exportTarget.successCount : 0
      if (count === 0) {
        this.exportModalVisible = false
        this.showError('导出失败', '该申请单无可导出的成功数据。')
        return
      }
      this.exportModalVisible = false
      this.showSuccess(
        '导出成功',
        `已导出 ${count} 条成功标识数据，文件：标识信息导出_${this.exportDateStr}_01.xlsx`,
      )
    },

    // --- 下载二维码 ---
    openDownloadModal(app) {
      const count = app.successCount || 0
      if (count > 200) {
        this.showError('超出限制', '为避免下载超时，单次下载数量不可超过 200 条，请分批下载。')
        return
      }
      this.downloadTarget = app
      this.downloadModalVisible = true
    },
    closeDownloadModal() {
      this.downloadModalVisible = false
      this.downloadTarget = null
    },
    doDownload() {
      const count = this.downloadTarget ? this.downloadTarget.successCount : 0
      if (count === 0) {
        this.downloadModalVisible = false
        this.showError('下载失败', '该申请单无可下载的成功数据。')
        return
      }
      this.downloadModalVisible = false
      const msg =
        count > 1
          ? `已打包 ${count} 条二维码图片，文件：二维码下载_${this.exportDateStr}_01.zip`
          : `已下载二维码图片：【标识码】_产品名称.png`
      this.showSuccess('下载成功', msg)
    },

    // --- 新增申请 ---
    addProductRow() {
      this.newAppForm.products.push({
        productName: '',
        batchNo: '',
        quantity: 1,
        showDropdown: false,
        searchResults: [],
      })
    },

    removeProductRow(idx) {
      if (this.newAppForm.products.length <= 1) return
      this.newAppForm.products.splice(idx, 1)
    },

    openProductSearch(idx) {
      const row = this.newAppForm.products[idx]
      row.showDropdown = true
      row.searchResults = [...this.productLibrary]
    },

    filterProductSearch(idx) {
      const row = this.newAppForm.products[idx]
      const kw = (row.productName || '').toLowerCase()
      row.searchResults = this.productLibrary.filter((p) => p.toLowerCase().includes(kw))
    },

    selectProduct(idx, name) {
      const row = this.newAppForm.products[idx]
      row.productName = name
      row.showDropdown = false
      row.searchResults = []
    },

    validateNewApp() {
      for (let i = 0; i < this.newAppForm.products.length; i++) {
        const p = this.newAppForm.products[i]
        if (!p.productName.trim()) {
          this.showError('校验失败', `第 ${i + 1} 行产品名称不能为空。`)
          return false
        }
        if (!p.batchNo.trim()) {
          this.showError('校验失败', `第 ${i + 1} 行批次号不能为空。`)
          return false
        }
        if (!p.quantity || p.quantity < 1 || !Number.isInteger(p.quantity)) {
          this.showError('校验失败', `第 ${i + 1} 行数量必须为正整数。`)
          return false
        }
      }
      if (this.totalApplyCount > 200) {
        this.showError('超出限制', '单次申请标识总数数量上限为 200 条，请调整数量后再提交。')
        return false
      }
      return true
    },

    generateOrderNo() {
      this.serialCounter++
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const dateStr = pad(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate())
      const serial = String(this.serialCounter).padStart(3, '0')
      return `GYHLBS${dateStr}${serial}`
    },

    saveApplication() {
      if (!this.validateNewApp()) return
      const orderNo = this.generateOrderNo()
      const products = this.newAppForm.products.map((p) => ({
        productName: p.productName.trim(),
        batchNo: p.batchNo.trim(),
        quantity: parseInt(p.quantity),
        successCount: 0,
        failCount: 0,
      }))
      const totalCount = products.reduce((s, p) => s + p.quantity, 0)
      const productNames = [...new Set(products.map((p) => p.productName))].join('、')
      const batchNos = [...new Set(products.map((p) => p.batchNo))].join('、')

      this.applications.unshift({
        id: Date.now(),
        orderNo,
        status: '待提交',
        productNames,
        productCount: products.length,
        batchNos,
        totalCount,
        successCount: 0,
        failCount: 0,
        remark: this.newAppForm.remark.trim(),
        createTime: this.getNow(),
        productDetails: products,
      })

      this.currentView = 'list'
      this.showSuccess('保存成功', `申请单 ${orderNo} 已保存，状态为"待提交"。`)
    },

    saveAndSubmit() {
      if (!this.validateNewApp()) return
      const orderNo = this.generateOrderNo()
      const products = this.newAppForm.products.map((p) => ({
        productName: p.productName.trim(),
        batchNo: p.batchNo.trim(),
        quantity: parseInt(p.quantity),
        successCount: 0,
        failCount: 0,
      }))
      const totalCount = products.reduce((s, p) => s + p.quantity, 0)
      const productNames = [...new Set(products.map((p) => p.productName))].join('、')
      const batchNos = [...new Set(products.map((p) => p.batchNo))].join('、')

      this.applications.unshift({
        id: Date.now(),
        orderNo,
        status: '处理中',
        productNames,
        productCount: products.length,
        batchNos,
        totalCount,
        successCount: 0,
        failCount: 0,
        remark: this.newAppForm.remark.trim(),
        createTime: this.getNow(),
        productDetails: products,
      })

      this.currentView = 'list'
      this.showSuccess('提交成功', `申请单 ${orderNo} 已保存并提交注册，后台正在异步处理中。`)
    },

    // --- 提示弹窗 ---
    showSuccess(title, content) {
      this.successModalTitle = title
      this.successModalContent = content
      this.successModalVisible = true
    },
    closeSuccessModal() {
      this.successModalVisible = false
    },
    showError(title, content) {
      this.errorTitle = title
      this.errorContent = content
      this.errorModalVisible = true
    },
    closeErrorModal() {
      this.errorModalVisible = false
    },

    getNow() {
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },

    // --- 全局点击关闭下拉 ---
    handleGlobalClick(e) {
      if (!e.target.closest('.product-search-cell')) {
        this.newAppForm.products.forEach((p) => {
          p.showDropdown = false
        })
      }
    },
  },

  mounted() {
    document.addEventListener('click', this.handleGlobalClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleGlobalClick)
  },
}
</script>

<style scoped>
/* ---- 通用 ---- */
.page-wrapper {
  height: 100%;
}
.page-card {
  background: #fff;
  border-radius: 8px;
}
.page-header {
  padding: 24px 24px 0;
}
.page-header h2 {
  font-size: 18px;
  color: #1f2937;
  margin-bottom: 4px;
}
.page-header small {
  color: #6b7280;
  font-size: 13px;
}

/* ---- 筛选栏 ---- */
.filter-bar-main {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  padding: 16px 24px;
  flex-wrap: wrap;
}
.filter-item label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
.filter-select {
  width: 130px;
}
.filter-input {
  width: 140px;
}
.filter-date {
  width: 130px;
}
.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.date-sep {
  color: #9ca3af;
  font-size: 13px;
}
.filter-btns {
  display: flex;
  gap: 8px;
}

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 16px;
}
.toolbar-left {
  display: flex;
  gap: 8px;
}

/* ---- 按钮 ---- */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.btn-primary {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}
.btn-primary:hover {
  background: #096dd9;
}
.btn-default {
  background: #fff;
  color: #374151;
  border-color: #d1d5db;
}
.btn-default:hover {
  border-color: #1890ff;
  color: #1890ff;
}
.btn-default:disabled {
  color: #d1d5db;
  cursor: not-allowed;
}
.btn-danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.btn-danger:hover {
  background: #b91c1c;
}
.btn-warn {
  background: #ff9800;
  color: #fff;
  border-color: #ff9800;
}
.btn-warn:hover {
  background: #e68900;
}
.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}
.btn-link {
  background: none;
  border: none;
  color: #1890ff;
  padding: 0;
  font-size: 13px;
  cursor: pointer;
}
.btn-link:hover {
  color: #096dd9;
}
.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
}
.btn-close:hover {
  color: #374151;
}

/* ---- 表格 ---- */
.table-wrap {
  overflow-x: auto;
  padding: 0 24px 16px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}
.data-table th {
  background: #fafafa;
  color: #6b7280;
  font-weight: 500;
  position: sticky;
  top: 0;
}

/* ---- 标签 ---- */
.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
}
.status-success {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}
.status-partial {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}
.status-fail {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}
.status-pending {
  background: #f0f5ff;
  color: #2f54eb;
  border: 1px solid #adc6ff;
}
.status-processing {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

/* ---- 操作列 ---- */
.action-cell {
  white-space: nowrap;
}
.action-link {
  color: #1890ff;
  cursor: pointer;
  margin-right: 8px;
  font-size: 13px;
  text-decoration: none;
}
.action-link:hover {
  color: #096dd9;
}
.action-link.danger {
  color: #dc2626;
}
.action-link.warn {
  color: #ff9800;
}
.action-link.warn:hover {
  color: #e68900;
}
.action-none {
  color: #d1d5db;
  font-size: 13px;
}
.code-link {
  color: #1890ff;
  cursor: pointer;
  text-decoration: underline;
}
.code-link:hover {
  color: #096dd9;
}
.cell-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- sticky 操作列 ---- */
.data-table th.sticky-col,
.data-table td.sticky-col {
  position: sticky;
  right: 0;
  background: #fff;
  z-index: 1;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.06);
}
.data-table th.sticky-col {
  z-index: 2;
  background: #fafafa;
}

/* ---- 分页 ---- */
.pagination {
  padding: 12px 24px;
  text-align: right;
}
.page-info {
  font-size: 13px;
  color: #6b7280;
}

/* ---- 空状态 ---- */
.empty-hint {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  padding: 24px;
}

/* ---- 弹窗通用 ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
.modal-card {
  background: #fff;
  border-radius: 8px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}
.modal-lg {
  width: 800px;
}
.modal-md {
  width: 520px;
}
.modal-sm {
  width: 420px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-top: 1px solid #e5e7eb;
}

/* ---- 确认弹窗 ---- */
.confirm-card {
  background: #fff;
  border-radius: 12px;
  width: 400px;
  padding: 32px 32px 24px;
  text-align: center;
  animation: slideUp 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.confirm-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  margin: 0 auto 16px;
  background: #fff3e0;
  border: 3px solid #ff9800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-icon-warn {
  font-size: 28px;
  font-weight: 700;
  color: #ff9800;
  line-height: 1;
}
.confirm-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}
.confirm-body {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.8;
  margin: 0 0 24px;
}
.confirm-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.btn-pill {
  min-width: 100px;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-default.btn-pill {
  background: #f5f5f5;
  color: #6b7280;
  border: 1px solid #d1d5db;
}
.btn-default.btn-pill:hover {
  background: #e5e7eb;
}
.btn-primary.btn-pill {
  background: #1890ff;
  color: #fff;
}
.btn-primary.btn-pill:hover {
  background: #096dd9;
}
.btn-danger.btn-pill {
  background: #ff4d4f;
  color: #fff;
}
.btn-danger.btn-pill:hover {
  background: #cf1322;
}

/* ---- 成功提示弹窗 ---- */
.success-card {
  background: #fff;
  border-radius: 12px;
  width: 400px;
  padding: 32px 32px 24px;
  text-align: center;
  animation: slideUp 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.success-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  margin: 0 auto 16px;
  background: #f6ffed;
  border: 3px solid #52c41a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.success-icon {
  font-size: 28px;
  font-weight: 700;
  color: #52c41a;
  line-height: 1;
}
.success-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}
.success-body {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.8;
  margin: 0 0 24px;
}
.success-footer {
  display: flex;
  justify-content: center;
}

/* ---- 表单通用 ---- */
.form-input {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  color: #1f2937;
  width: 100%;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}
.form-textarea {
  height: 80px;
  resize: vertical;
  font-family: inherit;
}
.form-row {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
}
.form-label {
  width: 90px;
  flex-shrink: 0;
  padding-top: 7px;
  font-size: 13px;
  color: #374151;
}

/* ---- 新增申请页 ---- */
.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.new-app-content {
  padding: 24px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 24px 0 12px;
  padding-left: 10px;
  border-left: 3px solid #1890ff;
}
.add-row-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}
.total-count-hint {
  font-size: 13px;
  color: #6b7280;
}
.total-count-hint strong {
  color: #1890ff;
}

/* ---- 产品搜索 ---- */
.product-search-cell {
  position: relative;
}
.product-search-input {
  width: 100%;
}
.product-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 180px;
  overflow-y: auto;
  z-index: 50;
  margin-top: 4px;
}
.product-dropdown-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}
.product-dropdown-item:hover {
  background: #f0f7ff;
}

/* ---- 新增页底栏 ---- */
.new-app-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

/* ---- 详情页 ---- */
.detail-content {
  padding: 24px;
}
.detail-list {
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.d-label {
  font-size: 13px;
  color: #6b7280;
}
.d-value {
  font-size: 13px;
  color: #1f2937;
}
.detail-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #1890ff;
}
.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* ---- 导出弹窗 ---- */
.export-info {
  margin-bottom: 20px;
}
.export-info-item {
  display: flex;
  margin-bottom: 10px;
}
.export-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  color: #6b7280;
}
.export-value {
  font-size: 13px;
  color: #1f2937;
}
.export-value strong {
  color: #1890ff;
}
.export-fields-section {
  margin-bottom: 16px;
}
.export-fields-title {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.export-check {
  display: block;
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
}
.export-check input {
  margin-right: 6px;
  accent-color: #1890ff;
}
.export-name-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
