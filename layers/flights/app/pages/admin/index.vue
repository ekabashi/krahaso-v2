<script setup lang="ts">
const localePath = useLocalePath()

definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

await navigateTo(localePath('/admin/analytics'), { replace: true })
</script>

<template>
  <div />
</template>


