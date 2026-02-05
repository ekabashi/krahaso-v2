<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  type?: 'cars' | 'flights'
  title?: string
  titleHighlight?: string
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'cars',
  title: '',
  titleHighlight: '',
  description: ''
})

const imageError = ref(false)
const currentIndex = ref(0)

const backgrounds = computed(() => {
  if (props.type === 'flights') {
    return [
      '/backgrounds/background-flight-1.png',
      '/backgrounds/background-flight-2.png',
      '/backgrounds/background-flight-3.png',
      '/backgrounds/background-flight-4.png'
    ]
  }

  return [
    '/backgrounds/background-rent-1.png',
    '/backgrounds/background-rent-2.png',
    '/backgrounds/background-rent-3.png',
    '/backgrounds/background-rent-4.png'
  ]
})

let rotationInterval: NodeJS.Timeout | null = null

function handleImageError() {
  imageError.value = true
}

function nextBackground() {
  currentIndex.value = (currentIndex.value + 1) % backgrounds.value.length
}

function startAutoRotation() {
  rotationInterval = setInterval(() => {
    nextBackground()
  }, 5000)
}

function stopAutoRotation() {
  if (rotationInterval) {
    clearInterval(rotationInterval)
    rotationInterval = null
  }
}

watch(() => props.type, () => {
  currentIndex.value = 0
  stopAutoRotation()
  startAutoRotation()
})

onMounted(() => {
  startAutoRotation()
})

onUnmounted(() => {
  stopAutoRotation()
})
</script>

<template>
  <div
    id="hero"
    class="relative bg-gray-900 text-white overflow-hidden"
  >
    <div class="absolute inset-0 bg-linear-to-br from-primary-900 via-primary-800 to-gray-900">
      <!-- Background Images Container -->
      <div class="relative w-full h-full">
        <TransitionGroup
          name="fade"
          tag="div"
          class="absolute inset-0"
        >
          <img
            v-for="(bg, index) in backgrounds"
            v-show="index === currentIndex && !imageError"
            :key="bg"
            :src="bg"
            :alt="`Background ${index + 1}`"
            class="absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity duration-1000"
            loading="eager"
            @error="handleImageError"
          >
        </TransitionGroup>
      </div>

      <div class="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/40 to-transparent" />
    </div>
    <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-26 lg:py-32 text-center">
      <h1 class="text-3xl md:text-6xl font-bold tracking-tight mb-6">
        <template v-if="props.title">
          {{ props.title }} <br>
          <span class="text-primary-400">{{ props.titleHighlight }}</span>
        </template>
        <template v-else>
          {{ $t('hero.title') }} <br>
          <span class="text-primary-400">{{ $t('hero.titleHighlight') }}</span>
        </template>
      </h1>
      <p class="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
        {{ props.description || $t('hero.description') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
