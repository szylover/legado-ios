import { Tabs } from 'expo-router';
import { BookOpen, Compass, Settings } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

const ACTIVE_COLOR = '#E8735A';
const INACTIVE_COLOR = '#999';

export default function TabLayout() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: { backgroundColor: bg, borderTopWidth: 0.5, borderTopColor: '#E0E0E0' },
        headerStyle: { backgroundColor: bg },
        headerTintColor: scheme === 'dark' ? '#FFF' : '#333',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '书架',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          headerTitle: '书架',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '发现',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
          headerTitle: '发现',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          headerTitle: '设置',
        }}
      />
    </Tabs>
  );
}
