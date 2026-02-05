<script setup lang="ts">
import { useCheckout } from '../../composables/useCheckout'

const emit = defineEmits<{
  next: []
  back: []
}>()

useI18n()
const { state, bookingOptions, options } = useCheckout()
const { formatPrice } = useFormatPrice()
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {{ $t('checkout.steps.extras.title') }}
    </h2>

    <p class="text-gray-600 dark:text-gray-400">
      {{ $t('checkout.steps.extras.description') }}
    </p>

    <div class="space-y-3">
      <USwitch
        v-if="bookingOptions?.second_driver"
        :model-value="state.options.secondDriver"
        :description="
          bookingOptions?.second_driver_price
            ? `${formatPrice(Number(bookingOptions.second_driver_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.secondDriver')"
        size="md"
        @update:model-value="options.setOption('secondDriver', $event)"
      />
      <USwitch
        v-if="bookingOptions?.gps_navigation"
        :model-value="state.options.gps"
        :description="
          bookingOptions?.gps_navigation_price
            ? `${formatPrice(Number(bookingOptions.gps_navigation_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.gpsNavigation')"
        size="md"
        @update:model-value="options.setOption('gps', $event)"
      />
      <USwitch
        v-if="bookingOptions?.maksikos"
        :model-value="state.options.maksikos"
        :description="
          bookingOptions?.maksikos_price
            ? `${formatPrice(Number(bookingOptions.maksikos_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.maksikos')"
        size="md"
        @update:model-value="options.setOption('maksikos', $event)"
      />
      <USwitch
        v-if="bookingOptions?.green_card"
        :model-value="state.options.greenCard"
        :description="
          bookingOptions?.green_card_price
            ? `${formatPrice(Number(bookingOptions.green_card_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.greenCard')"
        size="md"
        @update:model-value="options.setOption('greenCard', $event)"
      />
      <USwitch
        v-if="bookingOptions?.european_card"
        :model-value="state.options.europeanCard"
        :description="
          bookingOptions?.european_card_price
            ? `${formatPrice(Number(bookingOptions.european_card_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.europeanCard')"
        size="md"
        @update:model-value="options.setOption('europeanCard', $event)"
      />
      <USwitch
        v-if="bookingOptions?.road_assistance"
        :model-value="state.options.roadAssistance"
        :description="
          bookingOptions?.road_assistance_price
            ? `${formatPrice(Number(bookingOptions.road_assistance_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.roadAssistance')"
        size="md"
        @update:model-value="options.setOption('roadAssistance', $event)"
      />
      <USwitch
        v-if="bookingOptions?.out_of_kosovo"
        :model-value="state.options.outOfKosovo"
        :description="
          bookingOptions?.out_of_kosovo_price
            ? `${formatPrice(Number(bookingOptions.out_of_kosovo_price))}/day`
            : undefined
        "
        :label="$t('checkout.steps.extras.outOfKosovo')"
        size="md"
        @update:model-value="options.setOption('outOfKosovo', $event)"
      />
      <div
        v-if="
          !bookingOptions ||
          (!bookingOptions.second_driver &&
            !bookingOptions.gps_navigation &&
            !bookingOptions.maksikos &&
            !bookingOptions.green_card &&
            !bookingOptions.european_card &&
            !bookingOptions.road_assistance &&
            !bookingOptions.out_of_kosovo)
        "
        class="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center"
      >
        {{ $t('checkout.steps.extras.noOptionsAvailable') }}
      </div>
    </div>

    <div class="w-full">
      <UFormField :label="$t('checkout.steps.extras.additionalNotes')" class="w-full">
        <UTextarea
          :model-value="state.description"
          :rows="3"
          :placeholder="$t('checkout.steps.extras.additionalNotesPlaceholder')"
          size="md"
          class="w-full"
          @update:model-value="options.setDescription($event)"
        />
      </UFormField>
    </div>

    <div
      class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <UButton variant="outline" type="button" size="lg" @click="emit('back')">
        {{ $t('checkout.steps.extras.back') }}
      </UButton>
      <UButton
        type="button"
        variant="solid"
        color="primary"
        size="lg"
        @click="emit('next')"
      >
        {{ $t('checkout.steps.extras.continue') }}
      </UButton>
    </div>
  </div>
</template>
