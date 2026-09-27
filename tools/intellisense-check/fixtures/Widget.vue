<script setup lang="ts">
interface Options {
	max: number;
}
/**
 * Демонстрационный компонент фикстуры: полный публичный API.
 */
defineProps<{
	/** Метка кнопки */
	label: string;
	count?: number;
	options?: Options;
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
