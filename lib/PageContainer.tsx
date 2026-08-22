import { Platform, View, ViewStyle } from 'react-native';

export function PageContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        { flex: 1, width: '100%' },
        Platform.OS === 'web' ? { maxWidth: 680, alignSelf: 'center' } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
