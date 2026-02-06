<script setup lang="ts">
const { t } = useI18n()

// Current partners - fetched dynamically from API
const { partners } = usePartners()

// Benefits for partners
const benefits = [
  { key: 'reach', icon: 'i-lucide-users' },
  { key: 'marketing', icon: 'i-lucide-megaphone' },
  { key: 'scaling', icon: 'i-lucide-trending-up' },
  { key: 'data', icon: 'i-lucide-bar-chart-3' }
]

// Objections and responses
const objections = [
  { key: 'margin', icon: 'i-lucide-badge-percent' },
  { key: 'dependency', icon: 'i-lucide-link' },
  { key: 'brand', icon: 'i-lucide-building-2' },
  { key: 'transparency', icon: 'i-lucide-eye' }
]

// SEO
useSeoMeta({
  title: () => `${t('partner.seo.title')} | Aviopika`,
  description: () => t('partner.seo.description')
})
</script>

<template>
  <div>
    <!-- Hero Section with gradient -->
    <section
      class="
        relative overflow-hidden bg-linear-to-br from-primary/10 via-transparent
        to-primary/5 py-20
      "
    >
      <div
        class="
          absolute inset-0
          bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-primary-500),0.1),transparent_50%)]
        "
      />
      <UContainer class="relative">
        <UBreadcrumb
          :items="[
            { label: $t('nav.home'), to: '/' },
            { label: $t('nav.partner') }
          ]"
          class="mb-8"
        />

        <div class="max-w-3xl">
          <h1
            class="
              mb-6 text-4xl leading-tight font-bold
              md:text-5xl
            "
          >
            {{ $t('partner.hero.title') }}
          </h1>
          <p class="mb-8 text-xl leading-relaxed text-muted">
            {{ $t('partner.hero.description') }}
          </p>
          <div class="flex flex-wrap gap-4">
            <UButton
              to="#contact"
              size="xl"
              icon="i-lucide-handshake"
            >
              {{ $t('partner.hero.cta') }}
            </UButton>
            <UButton
              to="#benefits"
              size="xl"
              variant="outline"
              color="neutral"
              icon="i-lucide-arrow-down"
            >
              {{ $t('partner.benefits.title') }}
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Current Partners - Minimal Strip -->
    <section class="border-b border-default py-12">
      <UContainer>
        <div
          class="
            flex flex-col gap-6
            md:flex-row md:items-center md:justify-between
          "
        >
          <p class="text-sm font-medium tracking-wider text-muted uppercase">
            {{ $t('partner.current.title') }}
          </p>
          <div
            class="
              flex items-center gap-4
              md:gap-8
            "
          >
            <a
              v-for="partner in partners"
              :key="partner.id"
              :href="partner.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="partner.logo"
                :alt="partner.name"
                :class="[
                  `
                    h-7 max-w-40 object-contain opacity-70 grayscale transition
                    hover:opacity-100 hover:grayscale-0
                    md:h-8
                  `,
                  partner.id === 'erifly' ? 'invert' : ''
                ]"
                loading="lazy"
              >
            </a>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Benefits Section -->
    <section
      id="benefits"
      class="py-20"
    >
      <UContainer>
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-3xl font-bold">
            {{ $t('partner.benefits.title') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-muted">
            {{ $t('partner.benefits.description') }}
          </p>
        </div>

        <div
          class="
            grid gap-x-12 gap-y-16
            md:grid-cols-2
          "
        >
          <div
            v-for="benefit in benefits"
            :key="benefit.key"
            class="flex gap-5"
          >
            <div class="shrink-0">
              <div
                class="
                  flex h-14 w-14 items-center justify-center rounded-2xl
                  bg-primary/10
                "
              >
                <UIcon
                  :name="benefit.icon"
                  class="text-2xl text-primary"
                />
              </div>
            </div>
            <div>
              <h3 class="mb-2 text-xl font-semibold">
                {{ $t(`partner.benefits.items.${benefit.key}.title`) }}
              </h3>
              <p class="mb-4 text-muted">
                {{ $t(`partner.benefits.items.${benefit.key}.description`) }}
              </p>
              <ul class="space-y-2">
                <li class="flex items-start gap-2 text-sm">
                  <UIcon
                    name="i-lucide-check-circle"
                    class="mt-0.5 shrink-0 text-primary"
                  />
                  <span>{{ $t(`partner.benefits.items.${benefit.key}.point1`) }}</span>
                </li>
                <li class="flex items-start gap-2 text-sm">
                  <UIcon
                    name="i-lucide-check-circle"
                    class="mt-0.5 shrink-0 text-primary"
                  />
                  <span>{{ $t(`partner.benefits.items.${benefit.key}.point2`) }}</span>
                </li>
                <li class="flex items-start gap-2 text-sm">
                  <UIcon
                    name="i-lucide-check-circle"
                    class="mt-0.5 shrink-0 text-primary"
                  />
                  <span>{{ $t(`partner.benefits.items.${benefit.key}.point3`) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- How it works - Clean Steps -->
    <section class="bg-muted/30 py-20">
      <UContainer>
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-3xl font-bold">
            {{ $t('partner.howItWorks.title') }}
          </h2>
        </div>

        <div
          class="
            mx-auto grid max-w-4xl gap-8
            md:grid-cols-3
          "
        >
          <div
            v-for="(step, index) in ['integration', 'display', 'booking']"
            :key="step"
            class="relative text-center"
          >
            <!-- Connector line -->
            <div
              v-if="index < 2"
              class="
                absolute top-8 left-[60%] hidden h-px w-[80%] bg-border
                md:block
              "
            />

            <div class="relative">
              <div
                class="
                  mx-auto mb-6 flex h-16 w-16 items-center justify-center
                  rounded-full bg-primary text-2xl font-bold text-white
                "
              >
                {{ index + 1 }}
              </div>
              <h3 class="mb-2 text-lg font-semibold">
                {{ $t(`partner.howItWorks.steps.${step}.title`) }}
              </h3>
              <p class="text-sm text-muted">
                {{ $t(`partner.howItWorks.steps.${step}.description`) }}
              </p>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Objections Section - Accordion Style -->
    <section class="py-20">
      <UContainer>
        <div class="mx-auto max-w-3xl">
          <div class="mb-12 text-center">
            <h2 class="mb-4 text-3xl font-bold">
              {{ $t('partner.objections.title') }}
            </h2>
            <p class="text-lg text-muted">
              {{ $t('partner.objections.description') }}
            </p>
          </div>

          <UAccordion
            :items="objections.map(obj => ({
              label: $t(`partner.objections.items.${obj.key}.concern`),
              icon: obj.icon,
              content: $t(`partner.objections.items.${obj.key}.response`)
            }))"
            multiple
          >
            <template #content="{ item }">
              <div class="flex items-start gap-3 pb-2">
                <UIcon
                  name="i-lucide-lightbulb"
                  class="mt-1 shrink-0 text-primary"
                />
                <p class="text-muted">
                  {{ item.content }}
                </p>
              </div>
            </template>
          </UAccordion>
        </div>
      </UContainer>
    </section>

    <!-- CTA Section -->
    <section
      class="bg-linear-to-br from-primary/10 via-primary/5 to-transparent py-20"
    >
      <UContainer>
        <div
          id="contact"
          class="mx-auto max-w-2xl text-center"
        >
          <div
            class="
              mx-auto mb-8 flex h-20 w-20 items-center justify-center
              rounded-full bg-primary/10
            "
          >
            <UIcon
              name="i-lucide-handshake"
              class="text-4xl text-primary"
            />
          </div>
          <h2 class="mb-4 text-3xl font-bold">
            {{ $t('partner.cta.title') }}
          </h2>
          <p class="mb-8 text-lg text-muted">
            {{ $t('partner.cta.description') }}
          </p>
          <UButton
            to="mailto:partner@aviopika.com"
            size="xl"
            icon="i-lucide-mail"
          >
            {{ $t('partner.cta.button') }}
          </UButton>
          <p class="mt-6 text-sm text-muted">
            {{ $t('partner.cta.note') }}
          </p>
        </div>
      </UContainer>
    </section>
  </div>
</template>
