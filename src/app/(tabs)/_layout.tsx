import { Tabs } from 'expo-router/js-tabs';
import { useCart } from '@/context/CartContext';
import { Icon } from '@/components/ui/primitives';
import { colors } from '@/theme/tokens';

/** Início · Catálogo · Carrinho · Meus itens · Conta. */
export default function AppTabs() {
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <Icon name="home-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="catalogo" options={{ title: 'Catálogo', tabBarIcon: ({ color }) => <Icon name="search-outline" color={color} size={22} /> }} />
      <Tabs.Screen
        name="carrinho"
        options={{
          title: 'Carrinho',
          // Badge só quando há item: um "0" permanente é ruído.
          tabBarBadge: count > 0 ? count : undefined,
          tabBarIcon: ({ color }) => <Icon name="cart-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="itens" options={{ title: 'Meus itens', tabBarIcon: ({ color }) => <Icon name="ticket-outline" color={color} size={22} /> }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: ({ color }) => <Icon name="person-circle-outline" color={color} size={22} /> }} />
    </Tabs>
  );
}
