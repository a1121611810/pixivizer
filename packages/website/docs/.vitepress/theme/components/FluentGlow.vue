<template>
  <div class="fluent-glow-wrapper" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div
      v-if="showGlow"
      class="fluent-glow"
      :style="{ left: x + '%', top: y + '%' }"
    />
    <slot />
  </div>
</template>

<script setup>
import { ref } from "vue";

const x = ref(50);
const y = ref(50);
const showGlow = ref(false);

function onMouseMove(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  x.value = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
  y.value = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
  showGlow.value = true;
}

function onMouseLeave() {
  showGlow.value = false;
}
</script>

<style scoped>
.fluent-glow-wrapper {
  position: relative;
  overflow: hidden;
}

.fluent-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(90, 159, 212, 0.12) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.fluent-glow-wrapper > :deep(*) {
  position: relative;
  z-index: 1;
}
</style>
