<template>
  <main class="hero">
    <h1 class="headline">this is a sandbox, you're probably in the wrong place</h1>
    <p>it's online tho!</p>
    <p>bonkers</p>
    <p><em>come again</em></p>
  </main>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.headline {
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.15;
  margin: 0;
}
</style>
