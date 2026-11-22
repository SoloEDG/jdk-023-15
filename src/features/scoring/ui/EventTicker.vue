<script setup lang="ts">
import type { PinballDocument } from '@/shared/document'

defineProps<{ doc: PinballDocument }>()
</script>

<template>
  <ol class="ticker" aria-label="最近得分">
    <li v-if="doc.feed.length === 0">撞击机关后，得分会记在这里。</li>
    <li v-for="item in doc.feed" :key="item.uid" class="ticker-row">
      <span class="ticker-name">{{ item.name }}</span>
      <span class="ticker-parts">
        <span class="ticker-base">基础 {{ item.base }}</span>
        <span :class="['ticker-speed', { zero: item.speedBonus === 0 }]">
          速度 +{{ item.speedBonus }}
        </span>
        <span v-if="item.multiplier > 1" class="ticker-mult">×{{ item.multiplier }}</span>
        <span class="ticker-total">+{{ item.points }}</span>
      </span>
    </li>
  </ol>
</template>
