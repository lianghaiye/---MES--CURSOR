import { ensureStorageHeadroom, installStorageDebugHelpers } from '@/utils/safeStorage'

// 必须作为 main 的首个依赖：在各 store 初始化前腾出配额
ensureStorageHeadroom(512 * 1024)
installStorageDebugHelpers()
