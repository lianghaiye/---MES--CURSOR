<template>
  <svg
    class="il-qr-mock"
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect fill="#fff" width="100" height="100" />
    <rect fill="#000" x="8" y="8" width="28" height="28" rx="2" />
    <rect fill="#fff" x="13" y="13" width="18" height="18" rx="1" />
    <rect fill="#000" x="18" y="18" width="8" height="8" />
    <rect fill="#000" x="64" y="8" width="28" height="28" rx="2" />
    <rect fill="#fff" x="69" y="13" width="18" height="18" rx="1" />
    <rect fill="#000" x="74" y="18" width="8" height="8" />
    <rect fill="#000" x="8" y="64" width="28" height="28" rx="2" />
    <rect fill="#fff" x="13" y="69" width="18" height="18" rx="1" />
    <rect fill="#000" x="18" y="74" width="8" height="8" />
    <rect fill="#000" x="44" y="12" width="4" height="4" />
    <rect fill="#000" x="52" y="12" width="4" height="4" />
    <rect fill="#000" x="44" y="20" width="4" height="4" />
    <rect fill="#000" x="52" y="28" width="4" height="4" />
    <rect fill="#000" x="60" y="44" width="4" height="4" />
    <rect fill="#000" x="44" y="44" width="4" height="4" />
    <rect fill="#000" x="52" y="52" width="4" height="4" />
    <rect fill="#000" x="68" y="52" width="4" height="4" />
    <rect fill="#000" x="76" y="60" width="4" height="4" />
    <rect fill="#000" x="84" y="68" width="4" height="4" />
    <rect fill="#000" x="68" y="76" width="4" height="4" />
    <rect fill="#000" x="44" y="68" width="4" height="4" />
    <rect fill="#000" x="52" y="76" width="4" height="4" />
    <rect fill="#000" x="44" y="84" width="4" height="4" />
    <rect fill="#000" x="60" y="84" width="4" height="4" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 64 },
})
</script>

<style scoped>
.il-qr-mock {
  display: block;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  background: #fff;
}
</style>
