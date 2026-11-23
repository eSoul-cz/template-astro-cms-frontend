<script setup lang="ts">
import { onMounted, ref } from 'vue';

export interface MenuLink {
    href: string;
    label: string;
}

withDefaults(defineProps<{ links: MenuLink[]; label?: string }>(), { label: 'Menu' });

const open = ref(false);
// Without JavaScript the list is part of the HTML and visible; once the island is hydrated it folds behind the button.
const hydrated = ref(false);
onMounted(() => {
    hydrated.value = true;
});
</script>

<template>
    <div class="md:hidden">
        <button
            type="button"
            class="rounded-md border border-line px-3 py-1.5 text-sm font-semibold"
            aria-controls="mobile-menu"
            :aria-expanded="open"
            @click="open = !open"
        >
            {{ label }}
        </button>
        <ul id="mobile-menu" class="mt-3 flex flex-col gap-2" :hidden="hydrated && !open">
            <li v-for="link in links" :key="link.href">
                <a :href="link.href">{{ link.label }}</a>
            </li>
        </ul>
    </div>
</template>
