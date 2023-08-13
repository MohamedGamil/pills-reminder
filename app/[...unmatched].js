import { Link, Stack } from 'expo-router';
import { Image, Text, View } from 'react-native';


export default function Unmatched() {
  return (
    <Stack.Screen
      redirect='index'
      options={{
        title: '404',
        headerStyle: { backgroundColor: '#f4511e' },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    />
  );
}
