// Кейс 6a: типизация *.module.css ts-плагином css-modules-kit через чистый tsserver
// (та же цепочка, что питает $style в .vue: typeof import → виртуальный .d.ts токенов)
import styles from './Example2.module.css';

export const demo = styles.
