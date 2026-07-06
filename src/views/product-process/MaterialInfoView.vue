<template>
  <div />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({ name: 'MaterialInfoView' })

const router = useRouter()

onMounted(() => {
  router.replace('/product-process/products')
})
</script>
