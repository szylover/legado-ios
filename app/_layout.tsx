import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="booksource/index" options={{ headerShown: false }} />
      <Stack.Screen name="booksource/import" options={{ headerShown: false }} />
      <Stack.Screen name="rsssource/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="reader/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="book/[id]"
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
