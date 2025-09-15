<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="page">
    <header class="nav">
      <RouterLink to="/">home</RouterLink>
      <RouterLink to="/shop">shop</RouterLink>
    </header>
    <RouterView />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.nav {
  display: flex;
  gap: 1rem;
  font-size: 1rem;
  text-transform: lowercase;
}

.nav a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 0.25rem;
  transition: border-color 150ms ease;
}

.nav a.router-link-active {
  border-color: currentColor;
}

.nav a:hover {
  border-color: currentColor;
}
</style>
