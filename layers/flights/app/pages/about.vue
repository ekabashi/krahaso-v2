<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const values = [
  { key: 'transparency', icon: 'i-lucide-shield-check' },
  { key: 'family', icon: 'i-lucide-heart' },
  { key: 'direct', icon: 'i-lucide-link' }
]

const impactStats = [
  { value: '4', label: 'stats.providers' },
  { value: '50+', label: 'stats.routes' },
  { value: '24/7', label: 'about.impact.stats.searches' }
]

useSeoMeta({
  title: () => `${t('about.seo.title')} | Aviopika`,
  description: () => t('about.seo.description')
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section
      class="
        relative overflow-hidden bg-linear-to-br from-primary-950
        via-primary-900 to-primary-800 py-20
        sm:py-28
      "
    >
      <div
        class="
          absolute inset-0
          bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-primary-500),0.12),transparent_50%)]
        "
      />
      <UContainer class="relative">
        <div class="max-w-3xl">
          <p class="mb-3 text-sm tracking-wide text-primary-200/90 uppercase">
            {{ $t('about.hero.kicker') }}
          </p>
          <h1
            class="
              mb-5 text-4xl font-bold text-white
              sm:text-5xl
            "
          >
            {{ $t('about.hero.title') }}
          </h1>
          <p class="mb-8 text-lg text-primary-100/90">
            {{ $t('about.hero.description') }}
          </p>
          <div class="flex flex-wrap gap-4">
            <UButton
              size="xl"
              color="neutral"
              variant="solid"
              icon="i-lucide-search"
              class="
                bg-white text-primary-800
                hover:bg-primary-50
              "
              :to="localePath('/')"
            >
              {{ $t('about.hero.cta') }}
            </UButton>
            <UButton
              size="xl"
              variant="outline"
              color="neutral"
              icon="i-lucide-handshake"
              :to="localePath('/partner')"
            >
              {{ $t('about.hero.partnerCta') }}
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Mission -->
    <section class="py-20">
      <UContainer>
        <div
          class="
            grid items-start gap-10
            lg:grid-cols-[1.1fr_0.9fr]
          "
        >
          <div>
            <h2 class="mb-4 text-3xl font-bold">
              {{ $t('about.mission.title') }}
            </h2>
            <p class="mb-6 text-lg text-muted">
              {{ $t('about.mission.description') }}
            </p>
            <p class="text-sm text-muted">
              {{ $t('about.mission.detail') }}
            </p>
          </div>

          <UCard class="border border-default">
            <template #header>
              <div class="flex items-center gap-3">
                <div class="rounded-full bg-primary/10 p-2">
                  <UIcon
                    name="i-lucide-target"
                    class="text-primary"
                  />
                </div>
                <h3 class="font-semibold">
                  {{ $t('about.mission.promiseTitle') }}
                </h3>
              </div>
            </template>
            <ul class="space-y-3 text-sm">
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="mt-0.5 text-primary"
                />
                <span>{{ $t('about.mission.promise1') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="mt-0.5 text-primary"
                />
                <span>{{ $t('about.mission.promise2') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-check"
                  class="mt-0.5 text-primary"
                />
                <span>{{ $t('about.mission.promise3') }}</span>
              </li>
            </ul>
          </UCard>
        </div>
      </UContainer>
    </section>

    <!-- Values -->
    <section class="bg-muted/30 py-20">
      <UContainer>
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-3xl font-bold">
            {{ $t('about.values.title') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-muted">
            {{ $t('about.values.description') }}
          </p>
        </div>

        <div
          class="
            grid gap-6
            md:grid-cols-3
          "
        >
          <UCard
            v-for="value in values"
            :key="value.key"
            class="h-full"
          >
            <div class="space-y-3">
              <div
                class="
                  flex h-12 w-12 items-center justify-center rounded-xl
                  bg-primary/10
                "
              >
                <UIcon
                  :name="value.icon"
                  class="text-xl text-primary"
                />
              </div>
              <h3 class="text-lg font-semibold">
                {{ $t(`about.values.items.${value.key}.title`) }}
              </h3>
              <p class="text-sm text-muted">
                {{ $t(`about.values.items.${value.key}.description`) }}
              </p>
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <!-- Impact -->
    <section class="py-20">
      <UContainer>
        <div class="mb-10 text-center">
          <h2 class="mb-4 text-3xl font-bold">
            {{ $t('about.impact.title') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-muted">
            {{ $t('about.impact.description') }}
          </p>
        </div>

        <div
          class="
            mx-auto grid max-w-3xl grid-cols-1 gap-6
            sm:grid-cols-3
          "
        >
          <div
            v-for="stat in impactStats"
            :key="stat.label"
            class="rounded-2xl border border-default bg-default p-6 text-center"
          >
            <p class="mb-2 text-3xl font-bold text-primary">
              {{ stat.value }}
            </p>
            <p class="text-sm text-muted">
              {{ $t(stat.label) }}
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- CTA -->
    <section
      class="
        bg-linear-to-br from-primary-950 via-primary-900 to-primary-800 py-20
      "
    >
      <UContainer>
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="mb-4 text-3xl font-bold text-white">
            {{ $t('about.cta.title') }}
          </h2>
          <p class="mb-8 text-lg text-primary-100/90">
            {{ $t('about.cta.description') }}
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <UButton
              size="xl"
              color="neutral"
              variant="solid"
              icon="i-lucide-search"
              class="
                bg-white text-primary-800
                hover:bg-primary-50
              "
              :to="localePath('/')"
            >
              {{ $t('about.cta.primary') }}
            </UButton>
            <UButton
              size="xl"
              variant="outline"
              color="neutral"
              icon="i-lucide-mail"
              to="mailto:hello@aviopika.com"
            >
              {{ $t('about.cta.secondary') }}
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>
