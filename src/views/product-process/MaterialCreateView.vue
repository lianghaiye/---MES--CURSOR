<template>
  <div />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({ name: 'MaterialCreateView' })

const router = useRouter()

onMounted(() => {
  router.replace('/product-process/products/new')
})
</script>
