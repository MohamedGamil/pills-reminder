import * as Haptics from 'expo-haptics';
import SectionedMultiSelect from 'expo-sectioned-multi-select';
import Storage from 'expo-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Buffer } from "buffer";
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, Feather, Entypo, } from '@expo/vector-icons';
import Dialog from "react-native-dialog";
import {
  Text,
  Button,
  Center,
  Box,
  Heading,
  VStack,
  HStack,
  Input,
  IconButton,
  Checkbox,
  useToast,
  Icon,
  Divider,
} from 'native-base';

const STORE_KEY = 'secret_meds';
const DAYS = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
const DAYS_ITEMS = [...DAYS].map((item, idx) => ({ id: idx, name: item, disabled: true }));
DAYS_ITEMS.unshift({ name: 'Everyday', id: -1, disabled: false });

function HeaderButtons({ onAddPress }) {
  return (
    <>
      <Button background={'transparent'} padding={1} paddingLeft={3} paddingRight={3} onPress={() => onAddPress()} title="Add New">
        <Ionicons name="add-circle-sharp" size={24} color="#fff" />
      </Button>
    </>
  );
}

function MedsList() {
  const [ticker, setTicker] = useState(-1);
  const [tickerInterval, setTickerInterval] = useState(-1);
  const selectRef = useRef();
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [adding, setAdding] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [deleting, setDeleting] = useState(-1);
  const [list, setList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectItems, setSelectItems] = useState(DAYS_ITEMS);
  const [selectedItems, setSelectedItems] = useState([-1]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const toast = useToast();

  useEffect(() => {
    fetchFromStorage();
    setTickerInterval(() => {
      return setInterval(() => setTicker(getMicrotime()), 1000)
    });

    return () => clearInterval(tickerInterval);
  }, []);

  const fetchFromStorage = async () => {
    try {
      const dayKey = getDayTimeKey();
      const json = (await Storage.getItem({key: STORE_KEY})) ?? 'W10=';
      const items = JSON.parse(
        Buffer.from(json.toString(), 'base64').toString()
      );

      if (!items) {
        return;
      }

      for (let idx in items) {
        items[idx].isCompleted = items[idx]?.checks && items[idx].checks[dayKey];
      }

      // console.info('Fetch', {json, items});
      setList(items);
    } catch(err) {
      console.warn(err);
    }
  };

  const saveToStorage = async (items) => {
    if (false === Array.isArray(items)) {
      return;
    }

    try {
      const buf = Buffer(JSON.stringify(items) ?? '');
      const json = buf.toString('base64');
      await Storage.setItem({ key: STORE_KEY, value: json});

      const allNotif = await Notifications.getAllScheduledNotificationsAsync();

      for (let notif of allNotif) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        // console.info('Deleted notification: ', {id: notif.identifier, notif});
      }

      for (let item of items) {
        const { label, time, isCompleted } = item;

        // if (true === isCompleted) {
        //   continue;
        // }

        schedulePushNotification({
          title: `${(label ?? '').toUpperCase()} Time!`,
          body: `It is time to take ${label}`,
          hour: time.h,
          minute: time.m,
          repeats: true,
        });

        // console.info('Scheduled notification: ', {label, time});
      }

      // console.info('Save', {buf, json, items});
    } catch(err) {
      console.warn(err);
    }

    return false;
  };

  const finalizeAdding = () => {
    if (false === isAdding) {
      return;
    }

    Haptics.impactAsync('heavy');

    setIsAdding(false);
    setList(prevList => {
      const newItems = [...prevList, { ...adding }];

      saveToStorage(newItems);

      return newItems;
    });
  };

  const onSelectedDayChange = (selected_) => {
    if (selected_.indexOf(-1) > -1) {
      selectRef.current._closeSelector();
      setSelectItems((prev) => prev.map((item, idx) => (idx > 0
        ? {...item, disabled: true}
        : item
      )));
      setSelectedItems([-1]);
      return;
    } else if (selected_.length === 0) {
      selectRef.current._closeSelector();
      setTimeout(() => selectRef.current._toggleSelector(), 400);
    }

    setSelectedItems(selected_);
    setSelectItems((prev) => prev.map((item, idx) => (idx > 0
      ? {...item, disabled: false}
      : item
    )));
  };

  const onDateChange = (event, selectedDate_) => setSelectedDate(selectedDate_);
  const showDatetimePicker = (mode = 'time', callback = null) => {
    DateTimePickerAndroid.open({
      onChange: callback ?? onDateChange,
      value: selectedDate,
      mode: mode,
      display: 'clock',
      minuteInterval: 5,
      is24Hour: false,
    });
  };

  const addItem = (label) => {
    if (label === '') {
      toast.show({
        title: "Medication name missing!",
        status: "warning"
      });
      return;
    }

    setAdding({
      label,
      isCompleted: false,
      checks: {},
    });

    showDatetimePicker('time', (event, selectedDate_) => {
      const h = parseInt(selectedDate_.getHours());
      const m = parseInt(selectedDate_.getMinutes());
      const am = h < 12;

      setAdding(prev => {
        return {
          ...prev,
          time: { h, m, am },
        };
      });

      setIsAdding(true);
      finalizeAdding();
      setSelectedDate(selectedDate_);
    });
  };

  const handleDelete = (index, force = false) => {
    if (false === force) {
      setDeleting(index);
      setConfirmationVisible(true);
      return;
    }

    Haptics.impactAsync('heavy');

    setDeleting(-1);
    setConfirmationVisible(false);
    setList(prevList => {
      const newList = [...prevList.filter((_, itemI) => itemI !== index)];

      saveToStorage(newList);

      return newList;
    });
  };

  // TODO: ...
  const handleEdit = (index) => {
  };

  const cancelAdding = () => {
    setAdding({});
    setIsAdding(false);
    setSelectedItems([-1]);
  };

  // FIXME: ...
  const calcTimeLeft = (itemTime) => {
    const { h, m, am } = itemTime;
    const currentHours = getDateHours();
    const currentMins = getDateMinutes();
    let hours = currentHours >= h ? 0 : (h - currentHours - 1);
    let mins = 60 - (currentMins - m);
    let secs = 60 - getDateSeconds();
    mins = mins >= 60 ? 0 : mins;
    hours = hours < 10 ? `0${hours}` : hours;
    mins = mins < 10 ? `0${mins}` : mins;
    secs = secs < 10 ? `0${secs}` : secs;

    return hours + ':' + mins + ':' + secs;
  };

  // FIXME: ...
  const hasTimeLeft = (itemTime, testCritical = false) => {
    const { h, m, am } = itemTime;
    const currentHours = getDateHours();
    const currentMins = getDateMinutes();
    let hours = currentHours >= h ? 0 : (h - currentHours - 1);
    let mins = 60 - (currentMins - m);

    if (true === testCritical)
      return hours <= 0 && mins >= 0;

    return hours > 0 || mins > 0;
  };

  const getMicrotime = () => (new Date()).getTime();

  const getDayTimeKey = () => {
    const microtime = getMicrotime();
    const year = getDateYear(microtime);
    const month = getDateMonth(microtime);
    const day = getDateDay(microtime, true);

    return `${year}-${month}-${day}`;
  };

  const handleStatusChange = (index) => {
    Haptics.impactAsync('heavy');

    setList(prevList => {
      const newList = [...prevList];
      const microtime = getMicrotime();
      const key_ = getDayTimeKey();

      const completed = !newList[index].isCompleted;
      newList[index].isCompleted = completed;
      newList[index].checks = newList[index].checks ?? {};
      newList[index].checks = {
        ...newList[index].checks,
        [key_]: completed ? microtime : false,
      };

      saveToStorage(newList);

      return newList;
    });
  };

  const getDateYear = (date = null) => {
    const fromDate = new Date(date ?? new Date());

    return fromDate.getFullYear();
  };

  const getDateMonth = (date = null) => {
    const fromDate = new Date(date ?? new Date());

    return fromDate.getMonth();
  };

  const getDateDay = (date = null, fullDay = false) => {
    const fromDate = new Date(date ?? new Date());

    return true === fullDay
      ? fromDate.getDate()
      : fromDate.getDay();
  };

  const getDateHours = (date = null) => {
    const fromDate = new Date(date ?? new Date());

    return fromDate.getHours();
  };

  const getDateMinutes = (date = null) => {
    const fromDate = new Date(date ?? new Date());

    return fromDate.getMinutes();
  };

  const getDateSeconds = (date = null) => {
    const fromDate = new Date(date ?? new Date());

    return fromDate.getSeconds();
  };

  const getDayName = (date = null) => {
    const fromDate = getDateDay(date);

    return DAYS[fromDate];
  };

  const fixTimeHours = (timeUnits, zeroFix = true) => {
    let timeUnits_ = timeUnits > 12 ? timeUnits - 12 : timeUnits;

    if (timeUnits < 12 && timeUnits_ === 0) {
      timeUnits_ = 12;
    }

    return zeroFix && timeUnits_ < 10 ? `0${timeUnits_}` : timeUnits_;
  };

  const fixTimeMinutes = (timeUnits, zeroFix = true) => {
    const timeUnits_ = timeUnits >= 60 ? 0 : timeUnits;

    return zeroFix && timeUnits_ < 10 ? `0${timeUnits_}` : timeUnits_;
  };

  return (
    <Center w="100%">
      <Box w="100%" padding={6}>
        <Heading mt="4" mb="2" size="md">
          { getDayName() }
          { isAdding ? ' - Add New Medication' : '' }
        </Heading>

        <VStack marginTop={4} space={4} display={isAdding ? 'none' : 'flex'}>
          <HStack space={3}>
            <Input
              disabled={isAdding}
              flex={1}
              onChangeText={v => setInputValue(v)}
              value={inputValue}
              placeholder="Add New Medication" />
            <IconButton
              disabled={isAdding}
              width={12}
              borderRadius="sm"
              variant="solid"
              backgroundColor="emerald.500"
              icon={<Icon as={Feather} name="plus" size="md" color="warmGray.50" />}
              onPress={() => {
                addItem(inputValue);
                setInputValue("");
              }} />
          </HStack>
          <VStack space={3} marginTop={4}>
            {list.map((item, itemI) => {
              return (
                <HStack
                  w="100%"
                  space={1}
                  justifyContent="space-between"
                  alignItems="center"
                  key={item.label + itemI.toString()}>
                  <Checkbox
                    icon={<Icon name="check" size="xs" color="white" as={Entypo} />}
                    accessibilityLabel={`Check ${item.label}`}
                    isChecked={item.isCompleted}
                    onChange={() => handleStatusChange(itemI)}
                    value={item.label}>
                  </Checkbox>
                  <Text
                    width="100%"
                    flexShrink={1}
                    textAlign="left"
                    mx="2"
                    strikeThrough={item.isCompleted}
                    _light={{
                      color: item.isCompleted ? "gray.400" : "coolGray.800"
                    }}
                    _dark={{
                      color: item.isCompleted ? "gray.400" : "coolGray.50"
                    }}
                    onPress={() => handleStatusChange(itemI)}>
                    {item.label}
                  </Text>
                  {/* <IconButton
                    size="md"
                    colorScheme="gray"
                    backgroundColor="gray.500"
                    icon={<Icon name="edit" size="xs" color="white" as={<Ionicons name="pencil-sharp" />} />}
                    onPress={() => handleEdit(itemI)} /> */}
                  <Button
                    size="sm"
                    backgroundColor={hasTimeLeft(item.time, true) ? 'rose.500' : 'amber.500'}
                    display={hasTimeLeft(item.time) && !item.isCompleted ? 'block' : 'none'}>
                    <Text color='white' fontSize={10} letterSpacing={1}>
                      { `${fixTimeHours(item.time.h)}:${fixTimeMinutes(item.time.m)}` }
                      &nbsp;
                      { item.time.am ? 'AM' : 'PM' }
                    </Text>
                  </Button>
                  <IconButton
                    size="md"
                    colorScheme="rose"
                    backgroundColor="gray.500"
                    icon={<Icon name="minus" size="xs" color="white" as={Entypo} />}
                    onPress={() => handleDelete(itemI)} />
                </HStack>
              );
            })}
          </VStack>
        </VStack>

        {
          isAdding
            ? (
              <>
              <Text padding={2} fontSize={12} color='blueGray.500' fontWeight='semibold'>Medication Label</Text>
              <Text padding={2} fontSize={16} fontWeight='bold'>{ adding.label }</Text>
              <Divider marginY={2} />
              </>
            )
            : null
        }

        {
          isAdding
            ? (
              <>
              <Text padding={2} fontSize={12} color='blueGray.500' fontWeight='semibold'>Time of Day</Text>
              <Text padding={2} fontSize={16} fontWeight='bold'>
                { adding.time.h > 12 ? Math.floor(adding.time.h - 12) : adding.time.h }:{ adding.time.m } { adding.time.am ? 'AM' : 'PM' }
              </Text>
              <Divider marginY={2} />
              </>
            )
            : null
        }

        {
          isAdding
            ? (
              <>
              <Text padding={2} fontSize={12} color='blueGray.500' fontWeight='semibold'>Recurring Days</Text>
              <SectionedMultiSelect
                uniqueKey='id'
                selectText='Choose days...'
                showChips={true}
                hideSearch={true}
                modalWithSafeAreaView={true}
                items={selectItems}
                selectedItems={selectedItems}
                onSelectedItemsChange={onSelectedDayChange}
                ref={selectRef} />
              <Divider marginTop={4} />
              </>
            )
            : null
        }

        {
          isAdding
            ? (
              <HStack space={4} marginTop={6}>
                <Button flex={1} backgroundColor='emerald.500' onPress={() => finalizeAdding()}>
                  <Text fontSize={16} fontWeight='bold' color='white'>Add New Med</Text>
                </Button>
                <IconButton
                  width={12}
                  borderRadius="sm"
                  variant="solid"
                  backgroundColor="rose.500"
                  icon={<Icon as={Ionicons} name="close" size="md" color="warmGray.50" />}
                  onPress={() => cancelAdding()} />
              </HStack>
            )
            : null
        }

        <Dialog.Container visible={confirmationVisible}>
          <Dialog.Title>Are you sure?</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete this medication?
          </Dialog.Description>
          <Dialog.Button
            label="Cancel"
            color="green"
            style={{ fontWeight: 'bold' }}
            onPress={() => setConfirmationVisible(false)} />
          <Dialog.Button
            label="Delete"
            color="red"
            style={{ fontWeight: 'bold' }}
            onPress={() => handleDelete(deleting, true)} />
        </Dialog.Container>
      </Box>
    </Center>
  );
}

export default function Meds() {
  const [hasPermission, setHasPermission] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const getStoragePermissions = async () => {
      // const { status } = await Storage.requestPermissionsAsync();
      // setHasPermission(status === 'granted');
    };

    // getStoragePermissions();

    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // console.info('Notification: ', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // if (hasPermission === null) {
  //   return <Text>Requesting for camera permission</Text>;
  // }

  // if (hasPermission === false) {
  //   return <Text>No access to camera</Text>;
  // }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'start' }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "⏰ Medications Reminders List",
          headerStyle: { backgroundColor: '#E76646' },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          // headerRight: () => <HeaderButtons onAddPress={onAddPress} />,
        }}
      />

      <MedsList />
    </View>
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    sound: 'alarm.wav',
    vibrate: [0, 250, 250, 250],
  }),
});

async function schedulePushNotification(params = {body: 'It is time to take your meds..', title: 'Medications Alert!', hour: 12, minute: 0, repeats: true}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: { data: '...' },
      sound: 'alarm.wav',
      shouldPlaySound: true,
      vibrate: [0, 250, 250, 250],
    },
    trigger: {
      channelId: 'meds',
      hour: params.hour,
      minute: params.minute,
      repeats: params.repeats,
    },
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meds', {
      name: 'meds',
      importance: Notifications.AndroidImportance.MAX,
      vibrate: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'alarm.wav',
    });
  }

  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;

  // console.info('Notification token: ', token);

  return token;
}
