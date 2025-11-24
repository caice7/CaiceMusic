import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomModal, { ModalProps } from './Modal';

export default function ConfirmModal(props: Omit<ModalProps, 'children'> & { onConfirm: () => void }) {
  const { onConfirm, ...restProps } = props;
  const handleOk = () => {
    props.onClose();
    onConfirm();
  }
  return (
    <CustomModal
      {...restProps}
    >
      <View style={styles.deleteModalContent}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleOk}>
          <Text style={styles.buttonText}>确定</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={props.onClose}>
          <Text style={styles.buttonText}>取消</Text>
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  deleteModalContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    padding: 10,
  },
  buttonText: {
    color: '#2775B7',
    fontSize: 16,
  },
}); 