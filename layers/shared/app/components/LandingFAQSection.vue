<script setup lang="ts">
export interface FAQItem {
  label: string
  content: string
}

interface Props {
  items: FAQItem[]
  title: string
  description: string
}

defineProps<Props>()
</script>

<template>
  <UPageSection
    :title="title"
    :description="description"
  >
    <div class="w-full lg:w-3xl mx-auto px-4 sm:px-6">
      <UAccordion :items="items" />
    </div>
  </UPageSection>
</template>
