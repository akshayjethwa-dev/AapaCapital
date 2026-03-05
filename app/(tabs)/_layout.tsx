import { Tabs } from 'expo-router';
import { LayoutDashboard, TrendingUp, Zap, PieChart } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 1,
          borderTopColor: '#27272a', // zinc-800
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#10b981', // emerald-500
        tabBarInactiveTintColor: '#52525b', // zinc-500
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <TrendingUp size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fo"
        options={{
          title: 'F&O',
          tabBarIcon: ({ color }) => <Zap size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => <PieChart size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}