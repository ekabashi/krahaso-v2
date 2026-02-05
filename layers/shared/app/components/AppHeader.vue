<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <UHeader
    :toggle="false"
    :ui="{ toggle: 'hidden' }"
  >
    <template #left>
      <AppLogo />
    </template>

    <template #default>
      <div class="flex items-center gap-4">
        <ULink
          :to="localePath('/')"
          variant="ghost"
          size="sm"
        >
          {{ $t('shared.nav.home') }}
        </ULink>
        <ULink
          :to="localePath('/flights')"
          variant="ghost"
          size="sm"
        >
          {{ $t('shared.nav.flights') }}
        </ULink>
        <ULink
          :to="localePath('/makina')"
          variant="ghost"
          size="sm"
        >
          {{ $t('shared.nav.cars') }}
        </ULink>
      </div>
    </template>

    <template #right>
      <div class="flex items-center gap-2">
        <LocaleSwitcher />
        <UColorModeButton />
      </div>
    </template>
  </UHeader>
</template>
