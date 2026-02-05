<script setup lang="ts"></script>

<template>
  <div class="text-center py-20">
    <UIcon
      name="i-lucide-search"
      class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
    />
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {{ $t('emptyState.noCarsFound') }}
    </h3>
    <p class="text-muted">
      {{ $t('emptyState.tryAdjustingFilters') }}
    </p>
  </div>
</template>
