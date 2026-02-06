<script setup lang="ts">
interface Props {
  title: string
  value?: string | number | null
  change?: number
  trend?: 'up' | 'down'
  icon?: string
  loading?: boolean
  description?: string
  formula?: string
}

const props = defineProps<Props>()

const hasInfo = computed(() => props.description || props.formula)

const trendColor = computed(() => {
  if (props.change === undefined || props.change === null) return 'text-muted'
  return props.trend === 'up' ? 'text-success' : 'text-error'
})

const trendIcon = computed(() => {
  if (props.change === undefined || props.change === null) return null
  return props.trend === 'up' ? 'i-lucide-trending-up' : 'i-lucide-trending-down'
})

const formattedChange = computed(() => {
  if (props.change === undefined || props.change === null) return ''
  const sign = props.change > 0 ? '+' : ''
  return `${sign}${props.change.toFixed(1)}%`
})
</script>

<template>
  <UCard>
    <div class="space-y-2">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-medium text-muted">{{ title }}</span>
          <UPopover
            v-if="hasInfo"
            mode="hover"
            :open-delay="200"
            :close-delay="100"
          >
            <UIcon
              name="i-lucide-info"
              class="
                size-3.5 cursor-help text-dimmed transition-colors
                hover:text-muted
              "
            />
            <template #content>
              <div class="max-w-xs space-y-2 p-3">
                <p
                  v-if="description"
                  class="text-sm text-default"
                >
                  {{ description }}
                </p>
                <div
                  v-if="formula"
                  class="
                    rounded bg-elevated px-2 py-1 font-mono text-xs text-muted
                  "
                >
                  {{ formula }}
                </div>
              </div>
            </template>
          </UPopover>
        </div>
        <UIcon
          v-if="icon"
          :name="icon"
          class="text-muted"
        />
      </div>

      <!-- Value -->
      <div class="text-3xl font-bold">
        <USkeleton
          v-if="loading"
          class="h-9 w-24"
        />
        <span v-else>{{ value ?? '-' }}</span>
      </div>

      <!-- Change Indicator -->
      <div
        v-if="change !== undefined"
        :class="trendColor"
        class="flex items-center gap-1 text-sm"
      >
        <UIcon
          v-if="trendIcon"
          :name="trendIcon"
          class="size-4"
        />
        <span>{{ formattedChange }}</span>
        <span class="text-muted">vs. vorher</span>
      </div>

      <!-- Footer Slot -->
      <slot name="footer" />
    </div>
  </UCard>
</template>
