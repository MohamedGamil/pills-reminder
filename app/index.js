import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Text, Button, useToast } from 'native-base';
import { expo as AppConstants } from '../app.json';

export default function Home() {
  const router = useRouter();
  const toastr = useToast();
  const accessMeds = async () => {
    // For dev only:
    // REMOVE ME!
    // toastr.show({
    //   description: 'Welcome back'
    // });
    // router.push('meds');
    // return;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const res = await LocalAuthentication.authenticateAsync();

    if (!isEnrolled || !hasHardware) {
      toastr.show({
        description: 'Biometric authentication is not setup or not supported!',
      });
      return;
    }

    if (!res.success) {
      toastr.show({
        description: 'Unauthorized!'
      });
      return;
    }

    toastr.show({
      description: 'Welcome back'
    });

    router.push('meds');
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "💊 Pills Reminder",
          headerStyle: { backgroundColor: '#E9EDE8' },
          headerTintColor: '#1c1c1c',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Text fontWeight={'bold'} fontSize={24}>Welcome Back 👋</Text>
      <Text marginTop={1} marginBottom={6} fontWeight={'semibold'}>Don't forget to take your pills.</Text>
      <Button minWidth={180} backgroundColor={'blue.500'} onPress={accessMeds}>
        <Text color={'white'} fontWeight={'bold'}>Check Reminders List</Text>
      </Button>
      <Text marginTop={24} fontSize={11} color='coolGray.500'>v{ AppConstants.version ?? '1.0.0' }</Text>
    </View>
  );
}
