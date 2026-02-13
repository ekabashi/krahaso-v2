<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Flights Providers - Krahaso Admin'
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Provider
      </h1>
      <p class="mt-1 text-muted">
        Flugbuchungs-Anbieter und deren Status
      </p>
    </div>

    <UCard>
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon
          name="i-lucide-building-2"
          class="mb-4 size-12 text-muted"
        />
        <h2 class="text-lg font-semibold">
          Coming Soon
        </h2>
        <p class="mt-1 max-w-sm text-muted">
          Ãœbersicht aller Provider mit Health-Status, Sync-Zeiten und Konfiguration.
        </p>
      </div>
    </UCard>
  </div>
</template>



