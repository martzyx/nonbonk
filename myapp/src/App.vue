<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, onMounted, watch } from 'vue'

const isDark = ref(false)

const applyTheme = (value: boolean) => {
  document.documentElement.classList.toggle('dark', value)
}

onMounted(() => {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark') {
    isDark.value = true
  } else if (stored === 'light') {
    isDark.value = false
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme(isDark.value)
})

watch(isDark, (value) => {
  applyTheme(value)
  localStorage.setItem('theme', value ? 'dark' : 'light')
})

const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <header class="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
      <nav class="flex items-center gap-4 lowercase">
        <RouterLink
          to="/"
          class="border-b border-transparent pb-1 transition-colors hover:border-current"
          active-class="border-current"
        >
          home
        </RouterLink>
        <RouterLink
          to="/shop"
          class="border-b border-transparent pb-1 transition-colors hover:border-current"
          active-class="border-current"
        >
          shop
        </RouterLink>
      </nav>

      <button
        type="button"
        class="ml-auto flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-wide transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
        :aria-pressed="isDark"
        @click="toggleTheme"
      >
        <span>{{ isDark ? 'light' : 'dark' }} mode</span>
        <span aria-hidden="true">{{ isDark ? '☀️' : '🌙' }}</span>
      </button>
    </header>

    <RouterView />
  </div>
</template>
