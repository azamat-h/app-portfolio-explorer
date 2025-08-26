<template>
  <UContainer class="min-h-screen flex items-center justify-center py-20">
    <div class="w-full max-w-3xl space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-semibold">App Portfolio Search</h1>
        <p class="text-gray-500">
          Search installed apps by name, description, or tag
        </p>
      </div>

      <div class="flex gap-2">
        <UInput
          v-model="query"
          size="lg"
          placeholder="Search e.g. Word, text, microsoft"
          class="flex-1"
          icon="i-heroicons-magnifying-glass-20-solid"
          @keyup.enter="search"
        />
        <UButton
          size="lg"
          :loading="loading"
          icon="i-heroicons-magnifying-glass-20-solid"
          @click="search"
        >
          Search
        </UButton>
      </div>

      <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

      <div
        v-if="!loading && results.length === 0 && hasSearched"
        class="text-center text-gray-500"
      >
        No results found.
      </div>

      <!-- Loading skeletons -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard v-for="n in 3" :key="n">
          <template #header>
            <USkeleton class="h-6 w-2/3" />
          </template>
          <div class="space-y-2">
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-5/6" />
            <div class="mt-4 flex flex-wrap gap-2">
              <USkeleton
                v-for="t in 3"
                :key="t"
                class="h-6 w-16 rounded-full"
              />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Results with animation -->
      <TransitionGroup
        v-if="!loading && results.length"
        name="fade-up"
        tag="div"
        class="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <UCard
          v-for="(item, i) in results"
          :key="item.id"
          :style="{ transitionDelay: `${i * 60}ms` }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-lg">{{ item.name }}</h3>
            </div>
          </template>
          <p class="text-gray-600">{{ item.description }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <UBadge
              v-for="tag in itemTags(item)"
              :key="tag"
              color="primary"
              variant="soft"
              >{{ tag }}</UBadge
            >
          </div>
        </UCard>
      </TransitionGroup>
    </div>
  </UContainer>
</template>

<script lang="ts" setup>
import { ref } from "vue";

type Item = {
  id: string;
  name: string;
  description: string;
  tags: string[] | string;
};

const query = ref("");
const results = ref<Item[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

async function search() {
  error.value = null;
  hasSearched.value = true;
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const data = await $fetch<{ results: Item[] }>("/api/search", {
      query: { q: query.value.trim() },
    });
    results.value = data.results;
  } catch (err: unknown) {
    const anyErr = err as
      | { data?: { message?: string }; message?: string }
      | undefined;
    error.value =
      anyErr?.data?.message ?? anyErr?.message ?? "Failed to search";
  } finally {
    loading.value = false;
  }
}

function itemTags(item: Item): string[] {
  if (Array.isArray(item.tags)) return item.tags;
  const raw = item.tags ?? "";
  return String(raw)
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}
</script>

<style>
.fade-up-enter-active {
  transition:
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 380ms cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-leave-active {
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
