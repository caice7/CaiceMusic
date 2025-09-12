import AntDesign from '@expo/vector-icons/AntDesign';
import Slider from '@react-native-assets/slider';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MusicFile {
  name: string;
  uri: string;
  played: boolean;
}

export enum PlayMode {
  SEQUENCE = 'sequence',    // 顺序播放
  SINGLE = 'single',        // 单曲循环
  RANDOM = 'random'         // 随机播放
}

interface PlayerBarProps {
  // 当前播放的音乐
  currentMusic: MusicFile | null;
  // 是否正在播放
  isPlaying: boolean;
  // 当前播放时间
  position: string;
  // 总时长
  duration: number;
  // 滑块当前值
  sliderValue: number;
  // 改变滑块
  onSliderChange: (value: number) => void;
  // 滑块完成
  onSliderComplete: (value: number) => void;
  // 快进快退
  onSeek: (seconds: number) => void;
  // 播放暂停
  onPlayPause: () => void;
  // 搜索
  onSearch: () => void;
  // 拖动
  isDragging: React.RefObject<boolean>;
  // 播放模式
  playMode: PlayMode;
  // 播放模式切换
  onPlayModeChange: () => void;
  // 下一首
  onPlayNext: () => void;
  // 计时器
  onTimerPress: () => void;
  // 计时器是否激活
  timerActive: boolean;
}

const BUTTON_SIZE = 18;

export const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(0).padStart(2, '0')}`;
};

export default function PlayerBar({
  currentMusic,
  isPlaying,
  position,
  duration,
  sliderValue,
  onSliderChange,
  onSliderComplete,
  onSeek,
  onPlayPause,
  onSearch,
  isDragging,
  playMode,
  onPlayModeChange,
  onPlayNext,
  onTimerPress,
  timerActive,
}: PlayerBarProps) {

  // 获取播放模式图标
  const getPlayModeIcon = () => {
    switch (playMode) {
      case PlayMode.SEQUENCE:
        return "retweet";
      case PlayMode.SINGLE:
        return "reload1";
      case PlayMode.RANDOM:
        return "sharealt";
      default:
        return "retweet";
    }
  };

  return (
    <View style={styles.playerBar}>
      <View style={styles.playerInfo}>
        <Text style={styles.timeText}>{position}</Text>
        <Text style={styles.playerTitle} numberOfLines={1}>
          {currentMusic?.name || ''}
        </Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.seekButton}
          onPress={() => onSeek(-5)}>
          <AntDesign name="banckward" size={BUTTON_SIZE} color="#fff" />
        </TouchableOpacity>
        <View style={styles.sliderContainer}>
          {duration > 0 && <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={sliderValue}
            onValueChange={onSliderChange}
            onSlidingStart={() => {
              isDragging.current = true;
            }}
            onSlidingComplete={(value) => {
              isDragging.current = false;
              onSliderComplete(value);
            }}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="#ffffff80"
            thumbTintColor="#fff"
          />}
        </View>
        <TouchableOpacity
          style={styles.seekButton}
          onPress={() => onSeek(5)}>
          <AntDesign name="forward" size={BUTTON_SIZE} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onSearch}>
          <AntDesign name="search1" size={BUTTON_SIZE} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onPlayModeChange}>
          <AntDesign name={getPlayModeIcon()} size={BUTTON_SIZE} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onPlayPause}>
          <AntDesign
            name={isPlaying ? "pausecircleo" : "playcircleo"}
            size={BUTTON_SIZE}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onPlayNext}>
          <AntDesign name="stepforward" size={BUTTON_SIZE} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, timerActive && styles.timerButtonActive]}
          onPress={onTimerPress}>
          <AntDesign name="clockcircleo" size={BUTTON_SIZE} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2775B7',
    padding: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  playerTitle: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    width: 50,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sliderContainer: {
    flex: 1,
    height: 30,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  seekButton: {
    padding: 3,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#ffffff40',
    borderRadius: 12,
  },
}); 