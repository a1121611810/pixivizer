<template>
  <div class="fluent-ripple" @mousedown="onMouseDown">
    <span
      v-if="rippling"
      class="ripple-effect"
      :style="{ left: x + '%', top: y + '%' }"
    />
    <slot />
  </div>
</template>

<script setup>
import { ref } from "vue";

const x = ref(50);
const y = ref(50);
const rippling = ref(false);
let timeout = null;

function onMouseDown(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  x.value = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
  y.value = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
  rippling.value = true;
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    rippling.value = false;
  }, 600);
}
</script>

<style scoped>
.fluent-ripple {
  position: relative;
  overflow: hidden;
}

.ripple-effect {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-anim 0.6s ease-out forwards;
  pointer-events: none;
}

@keyframes ripple-anim {
  to {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}
</style>
