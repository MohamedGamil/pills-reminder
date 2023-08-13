import { Stack } from 'expo-router/stack';
import Home from './index';
import { NativeBaseProvider } from 'native-base';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function Layout() {
  return (
    <NativeBaseProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          statusBarColor: '#1c1c1c',
          headerTintColor: '#000',
          headerStyle: {
            backgroundColor: '#29767F',
          },
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
          },
        }}>
      </Stack>
    </NativeBaseProvider>
  );
}
