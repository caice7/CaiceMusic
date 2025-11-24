import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomModal from './Modal';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onLocation: () => void;
  searchKeyword: string;
  onSearchKeywordChange: (text: string) => void;
  onSearch: () => void;
}

export default function SearchModal({
  visible,
  onClose,
  searchKeyword,
  onSearchKeywordChange,
  onLocation,
  onSearch,
}: SearchModalProps) {
  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="搜索歌曲">
      <TextInput
        style={styles.searchInput}
        placeholder="输入搜索关键词"
        value={searchKeyword}
        onChangeText={onSearchKeywordChange}
        autoFocus
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={onLocation}>
          <Text style={styles.modalButtonText}>当前定位</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={onSearch}>
          <Text style={styles.modalButtonText}>搜索</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={onClose}>
          <Text style={styles.modalButtonText}>取消</Text>
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    padding: 10,
  },
  modalButtonText: {
    color: '#2775B7',
    fontSize: 16,
  },
}); 