import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomModal from './Modal';

interface TimerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (hours: number) => void;
}

export default function TimerModal({
  visible,
  onClose,
  onSelectTime,
}: TimerModalProps) {
  const timeOptions = [0.5, 1, 1.5, 2, 3];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="选择定时时间">
      <View style={styles.timeOptions}>
        {timeOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.timeOption}
            onPress={() => {
              onSelectTime(option);
              onClose();
            }}>
            <Text style={styles.timeOptionText}>{option}小时</Text>
          </TouchableOpacity>
        ))}
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  timeOptions: {
    gap: 10,
  },
  timeOption: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#2775B7',
  },
}); 