<script setup lang="ts">
/**
 * Демонстрационный компонент фикстуры: полный публичный API.
 */
defineProps<{
	/** Метка кнопки */
	label: string;
	count?: number;
}>();
defineEmits<{
	(e: 'save', id: number): void;
	(e: 'close'): void;
}>();
const title = defineModel<string | null>();
defineExpose({ focus: () => undefined });
</script>

<template>
	<button type="button">{{ label }} {{ title }}</button>
</template>
