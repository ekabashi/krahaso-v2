<script setup lang="ts">
export interface FeatureItem {
  icon: string
  title: string
  description: string
  color?: string
}

interface Props {
  features: FeatureItem[]
  columns?: 2 | 3 | 4
}

const props = withDefaults(defineProps<Props>(), {
  columns: 4
})

const gridClass = computed(() => {
  const cols: Record<number, string> = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4'
  }
  return `grid grid-cols-1 sm:grid-cols-2 ${cols[props.columns]} gap-4 sm:gap-6`
})
</script>

<template>
  <div :class="gridClass">
    <UCard
      v-for="feature in features"
      :key="feature.title"
      :ui="{ body: 'p-4 sm:p-6' }"
      class="hover:shadow-lg transition-shadow text-center"
    >
      <div class="flex flex-col items-center space-y-2 sm:space-y-3">
        <div
          class="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10"
        >
          <UIcon
            :name="feature.icon"
            class="text-2xl sm:text-3xl text-primary-600"
          />
        </div>
        <h3 class="text-base sm:text-lg font-semibold wrap-break-word">
          {{ feature.title }}
        </h3>
        <p class="text-xs sm:text-sm text-muted wrap-break-word">
          {{ feature.description }}
        </p>
      </div>
    </UCard>
  </div>
</template>
