<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
)

const props = defineProps<{
  data: Array<{ month: string; bookingsCount: number }>
}>()

const { t } = useI18n()

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-')
  if (!year || !month) return monthKey
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('sq-AL', { month: 'short', year: 'numeric' })
}

const chartData = computed(() => ({
  labels: props.data.map((item) => formatMonthLabel(item.month)),
  datasets: [
    {
      label: t('superadmin.dashboard.stats.totalBookings'),
      data: props.data.map((item) => item.bookingsCount),
      backgroundColor: 'rgb(16, 185, 129)',
      hoverBackgroundColor: 'rgb(5, 150, 105)',
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.8,
    },
  ],
}))

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderWidth: 0,
      padding: 12,
      displayColors: false,
      callbacks: {
        label: (context) => {
          const value = context.parsed.y
          if (value === null || value === undefined) return ''
          return `${context.dataset.label}: ${value}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#6b7280', font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: {
        color: '#6b7280',
        font: { size: 11 },
        precision: 0,
      },
    },
  },
}
</script>

<template>
  <div class="w-full h-full">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
