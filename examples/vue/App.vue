<script setup>
import { ref } from 'vue';
import { compress, formatBytes } from 'compressojs';

const result = ref(null);
const loading = ref(false);

async function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  loading.value = true;
  result.value = await compress(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp',
    maxSizeMB: 2,
  });
  loading.value = false;
}
</script>

<template>
  <div style="max-width: 600px; margin: 2rem auto; font-family: system-ui">
    <h1>Compresso — Vue Example</h1>

    <input type="file" accept="image/*" @change="handleFile" />

    <p v-if="loading">Optimizing...</p>

    <div v-if="result" style="margin-top: 1rem">
      <div style="background: #f3f4f6; padding: 1rem; border-radius: 8px">
        <p><strong>Original:</strong> {{ formatBytes(result.originalSize) }}</p>
        <p><strong>Optimized:</strong> {{ formatBytes(result.compressedSize) }}</p>
        <p><strong>Reduction:</strong> {{ result.savings }}%</p>
        <p><strong>Dimensions:</strong> {{ result.width }} × {{ result.height }}</p>
      </div>
      <img
        :src="result.url"
        alt="Optimized"
        style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem"
      />
    </div>
  </div>
</template>
