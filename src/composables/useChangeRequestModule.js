import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  resolveChangeRequestModule,
  getDocNo,
} from '@/constants/changeRequestModule'

export function useChangeRequestModule() {
  const route = useRoute()
  return computed(() => resolveChangeRequestModule(route))
}

export { getDocNo }
