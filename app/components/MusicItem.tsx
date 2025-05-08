import AntDesign from '@expo/vector-icons/AntDesign';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MusicFile {
  name: string;
  uri: string;
  played: boolean;
}

interface MusicItemProps {
  item: MusicFile;
  onPress: (item: MusicFile) => void;
  onDelete: () => void;
  isCurrent?: boolean;
}

export default function MusicItem({ item, onPress, onDelete, isCurrent }: MusicItemProps) {
  return (
    <TouchableOpacity
      style={styles.musicItem}
      onPress={() => onPress(item)}>
      <View style={styles.musicInfo}>
        <Text
          style={[
            styles.musicName,
            isCurrent && styles.currentMusicName
          ]}
          numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}>
        <AntDesign name="minuscircleo" size={18} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  musicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  musicInfo: {
    flex: 1,
  },
  musicName: {
    fontSize: 16,
  },
  currentMusicName: {
    color: '#2775B7',
  },
  deleteButton: {
    padding: 5,
  },
}); 