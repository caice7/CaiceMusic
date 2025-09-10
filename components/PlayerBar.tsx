import AntDesign from '@expo/vector-icons/AntDesign';
import Slider from '@react-native-community/slider';
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
  currentMusic: MusicFile | null;
  isPlaying: boolean;
  position: string;
  duration: number;
  sliderValue: number;
  onSliderChange: (value: number) => void;
  onSliderComplete: (value: number) => void;
  onSeek: (seconds: number) => void;
  onPlayPause: () => void;
  onSearch: () => void;
  isDragging: React.RefObject<boolean>;
  playMode: PlayMode;
  onPlayModeChange: () => void;
  onPlayNext: () => void;
  onTimerPress: () => void;
  timerActive: boolean;
}

const BUTTON_SIZE = 18;

export const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
        <Slider
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
            console.log(value);
            onSliderComplete(value);
          }}
          minimumTrackTintColor="#fff"
          maximumTrackTintColor="#ffffff80"
          thumbTintColor="#fff"
        />
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
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  slider: {
    flex: 1,
    height: 30,
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