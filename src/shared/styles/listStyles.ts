import { StyleSheet } from 'react-native';

/** Layout-only helpers shared by list screens (no visual tokens here). */
export const listStyles = StyleSheet.create({
  /** Lets empty states center inside FlatList/ScrollView content. */
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
});
