<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="String(route.meta.page ?? route.name)" />
    </Transition>
  </RouterView>
</template>