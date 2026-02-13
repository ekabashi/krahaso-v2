<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Flights Settings - Krahaso Admin'
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Einstellungen
      </h1>
      <p class="mt-1 text-muted">
        Systemkonfiguration und Zugangsdaten
      </p>
    </div>

    <UCard>
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon
          name="i-lucide-settings"
          class="mb-4 size-12 text-muted"
        />
        <h2 class="text-lg font-semibold">
          Coming Soon
        </h2>
        <p class="mt-1 max-w-sm text-muted">
          API-Keys, Provider-Konfiguration und Admin-Zugangsverwaltung.
        </p>
      </div>
    </UCard>
  </div>
</template>



