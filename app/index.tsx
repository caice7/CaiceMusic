import CustomModal from '@/components/Modal';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = '@myapp/items';

export default function HomeScreen() {
  const [items, setItems] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  // 打印所有存储内容
  const printAllStorage = async () => {
    try {
      // 获取所有存储键
      const keys = await AsyncStorage.getAllKeys();
      // 批量获取键值对
      const storedData = await AsyncStorage.multiGet(keys);
      // 遍历输出结果
      let result = '';
      storedData.forEach(([key, value]) => {
        result += `[${key}]: ${value}\n`;
      });
      console.log(result);
    } catch (error) {
      console.error('读取存储失败:', error);
    }
  };


  useFocusEffect(
    useCallback(() => {
      // printAllStorage();
      const loadItems = async () => {
        try {
          const [storedItems, lastClickedItem] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem('@myapp/lastClickedItem')
          ]);

          if (storedItems) {
            setItems(JSON.parse(storedItems));
          }

          // 如果有最后点击的 item，自动跳转
          if (lastClickedItem) {
            router.push({
              pathname: '/music',
              params: { title: lastClickedItem }
            });
          }
        } catch (error) {
          console.error('Error loading items:', error);
        }
      };
      loadItems();
    }, [])
  );

  const handleAddClick = () => {
    setModalVisible(true);
  };

  const handleAddItem = async () => {
    if (inputText.trim()) {
      try {
        const storedItems = await AsyncStorage.getItem(STORAGE_KEY);
        const currentItems = storedItems ? JSON.parse(storedItems) : [];
        const newItems = [...currentItems, inputText.trim()];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
        setItems(newItems);
        setInputText('');
        setModalVisible(false);
      } catch (error) {
        console.error('Error saving item:', error);
      }
    }
  };

  const deleteItem = async (index: number, item: string) => {
    try {
      const storedItems = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        const currentItems = JSON.parse(storedItems);
        const newItems = currentItems.filter((_: any, i: number) => i !== index);

        // 删除对应的音乐文件存储
        await AsyncStorage.removeItem(`@music/${item}`);

        // 更新列表存储
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
        setItems(newItems);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleItemPress = (item: string) => {
    // 保存最后点击的 item
    AsyncStorage.setItem('@myapp/lastClickedItem', item);
    router.push({
      pathname: '/music',
      params: { title: item }
    });
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleItemPress(item)}>
      <Text style={styles.itemText}>{item}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteItem(index, item)}>
        <AntDesign name="minuscircleo" size={18} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '首页',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#2775B7',
          },
          headerTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAddClick}>
              <View style={{ width: 24, marginRight: 15 }}>
                <AntDesign name="plus" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.list}
        />
      </View>

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="添加分类">
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="请输入分类名称"
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}>
          <Text style={styles.buttonText}>添加</Text>
        </TouchableOpacity>
      </CustomModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  deleteButton: {
    padding: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2775B7',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
