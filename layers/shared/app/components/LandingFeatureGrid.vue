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

// Logic for Bento Grid classes based on index
const getBentoClass = (index: number, total: number) => {
  // Pattern for 4 items: Big-Small, Small-Big
  if (total === 4) {
    if (index === 0 || index === 3) return 'md:col-span-2 lg:col-span-7' // 7/12 (approx 58%)
    return 'md:col-span-2 lg:col-span-5' // 5/12 (approx 42%)
  }
  // Fallback for other counts
  return 'col-span-1'
}
</script>

<template>
  <div class="relative w-full">
    <!-- Grid Layout: Uses 12 columns on large screens for Bento effect -->
    <div 
      class="grid gap-6 auto-rows-fr"
      :class="[
        features.length === 4 
          ? 'grid-cols-1 md:grid-cols-4 lg:grid-cols-12' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      ]"
    >
      <div
        v-for="(feature, index) in features"
        :key="feature.title"
        class="group relative overflow-hidden rounded-4xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 transition-all duration-500 hover:border-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/10"
        :class="getBentoClass(index, features.length)"
      >
        <!-- Background Gradient Decoration -->
        <div 
          class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-3xl pointer-events-none"
        />

        <div class="relative z-10 flex h-full flex-col justify-between gap-6">
          <!-- Icon Header -->
          <div class="flex items-start justify-between">
            <div 
              class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
            >
              <UIcon
                :name="feature.icon"
                class="h-8 w-8"
              />
            </div>
          </div>

          <!-- Content -->
          <div>
            <h3 class="mb-3 text-xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {{ feature.title }}
            </h3>
            <p class="text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
