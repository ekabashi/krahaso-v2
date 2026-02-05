<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const props = defineProps<{
  data: Array<{ month: string; revenue: number; fee: number }>
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
      label: t('superadmin.dashboard.stats.totalFee'),
      data: props.data.map((item) => item.fee),
      borderColor: 'rgb(245, 158, 11)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: 'rgb(245, 158, 11)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    },
    {
      label: t('superadmin.dashboard.stats.revenue'),
      data: props.data.map((item) => item.revenue),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    },
  ],
}))

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderWidth: 0,
      padding: 12,
      displayColors: true,
      boxPadding: 4,
      callbacks: {
        label: (context) => {
          const value = context.parsed.y
          if (value === null || value === undefined) return ''
          const formattedValue = `€${value.toLocaleString('sq-AL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
          return `${context.dataset.label}: ${formattedValue}`
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
        callback: (value) => `€${Number(value).toLocaleString('sq-AL')}`,
      },
    },
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
}
</script>

<template>
  <div class="w-full h-full">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
