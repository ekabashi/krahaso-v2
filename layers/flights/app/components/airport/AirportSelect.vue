<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Airport } from '~/types/flight'
import { useAirports } from '../../composables/useAirports'

defineProps<{
  modelValue: Airport | null
  placeholder?: string
  icon?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Airport | null]
}>()

const { searchAirports, popularAirports, airports, fetchAirports } = useAirports()

const searchTerm = ref('')
const searchResults = ref<Airport[]>([])
const isSearching = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, async (query) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (query.length < 2) {
    searchResults.value = popularAirports.value.length > 0
      ? popularAirports.value
      : airports.value.slice(0, 10)
    return
  }

  searchTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      searchResults.value = await searchAirports(query)
    } finally {
      isSearching.value = false
    }
  }, 200)
})

watch(popularAirports, (newVal) => {
  if (newVal.length > 0 && searchResults.value.length === 0) {
    searchResults.value = newVal
  }
}, { immediate: true })

watch(airports, (newVal) => {
  if (newVal.length > 0 && searchResults.value.length === 0) {
    searchResults.value = popularAirports.value.length > 0
      ? popularAirports.value
      : newVal.slice(0, 10)
  }
}, { immediate: true })

onMounted(() => {
  if (airports.value.length === 0) {
    fetchAirports()
  }
})
</script>

<template>
  <UInputMenu
    v-model:search-term="searchTerm"
    :model-value="modelValue ?? undefined"
    :items="searchResults"
    :loading="isSearching"
    :placeholder="placeholder || 'Search airport...'"
    :icon="icon"
    label-key="name"
    by="code"
    open-on-focus
    :ui="{ base: modelValue ? 'ps-10' : '' }"
    class="w-full"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #item="{ item }">
      <div class="flex items-center gap-1">
        <span class="w-10 font-mono font-bold text-primary">{{ item.code }}</span>
        <div class="flex flex-col">
          <span class="font-medium">{{ item.name }}</span>
          <span class="text-xs text-muted">{{ item.country }}</span>
        </div>
      </div>
    </template>

    <template
      v-if="modelValue"
      #leading
    >
      <span class="pr-4 font-mono text-sm font-bold text-primary">{{ modelValue.code }}</span>
    </template>
  </UInputMenu>
</template>
