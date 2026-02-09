<template>
  <section class="relative overflow-hidden bg-linear-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
    <!-- Topographic lines -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07] dark:opacity-[0.12]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1200 600">
      <path d="M0 300 Q200 250 400 280 T800 260 T1200 290" fill="none" stroke="currentColor" stroke-width="1.5" class="text-neutral-900 dark:text-neutral-100" />
      <path d="M0 340 Q180 310 450 340 T850 310 T1200 350" fill="none" stroke="currentColor" stroke-width="1.5" class="text-neutral-900 dark:text-neutral-100" />
      <path d="M0 280 Q300 230 550 260 T950 240 T1200 270" fill="none" stroke="currentColor" stroke-width="1.5" class="text-neutral-900 dark:text-neutral-100" />
      <path d="M0 360 Q220 340 480 360 T880 340 T1200 370" fill="none" stroke="currentColor" stroke-width="1.5" class="text-neutral-900 dark:text-neutral-100" />
      <ellipse cx="600" cy="300" rx="280" ry="120" fill="none" stroke="currentColor" stroke-width="1" class="text-neutral-900 dark:text-neutral-100" />
      <ellipse cx="600" cy="300" rx="200" ry="80" fill="none" stroke="currentColor" stroke-width="1" class="text-neutral-900 dark:text-neutral-100" />
      <ellipse cx="600" cy="300" rx="110" ry="40" fill="none" stroke="currentColor" stroke-width="1" class="text-neutral-900 dark:text-neutral-100" />
    </svg>
    <!-- Accent route line -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-30" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1200 600">
      <path d="M0 320 Q250 270 500 310 T900 280 T1200 320" fill="none" stroke="var(--color-primary-500)" stroke-width="2" />
    </svg>

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <slot />
    </div>
  </section>
</template>
