import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MusicItem from './components/MusicItem';
import PlayerBar, { PlayMode } from './components/PlayerBar';
import SearchModal from './components/SearchModal';
import TimerModal from './components/TimerModal';

interface MusicFile {
  // 歌名
  name: string;
  // 地址
  uri: string;
  // 已播
  played: boolean;
}

export default function MusicScreen() {
  const params = useLocalSearchParams();
  const title = params.title as string;
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [currentMusic, setCurrentMusic] = useState<MusicFile | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState('00:00');
  const [duration, setDuration] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const isDragging = useRef(false);
  const lastPosition = useRef("00:00");
  const updateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const flatListRef = useRef<FlatList>(null);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.SEQUENCE);
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 格式化时间为 MM:SS 格式
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 处理进度条拖动
  const handleSliderChange = useCallback((value: number) => {
    setSliderValue(value);
  }, []);

  // 更新播放进度
  const updatePlaybackStatus = useCallback(async () => {
    if (sound && isPlaying && !isDragging.current) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          const currentPosition = formatTime(status.positionMillis);
          // 只有当位置真正发生变化时才更新
          if (currentPosition !== lastPosition.current) {
            lastPosition.current = currentPosition;
            setPosition(currentPosition);
            setSliderValue(status.positionMillis);
          }
        }
      } catch (error) {
        console.error('Error updating playback status:', error);
      }
    }
  }, [sound, isPlaying]);

  // 设置定时更新
  useEffect(() => {
    if (isPlaying && !isDragging.current) {
      // 每100ms更新一次状态
      updateInterval.current = setInterval(() => {
        updatePlaybackStatus();
      }, 100);
    } else {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    }

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [isPlaying, updatePlaybackStatus]);

  // 处理进度条拖动完成
  const handleSliderComplete = useCallback(async (value: number) => {
    if (sound) {
      try {
        await sound.setPositionAsync(value);
        const time = formatTime(value);
        lastPosition.current = time;
        setPosition(time);
        setSliderValue(value);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  }, [sound]);

  // 处理快进快退
  const handleSeek = useCallback(async (seconds: number) => {
    if (sound) {
      try {
        const newPosition = Math.max(0, Math.min(sliderValue + seconds * 1000, duration));
        await sound.setPositionAsync(newPosition);
        setPosition(formatTime(newPosition));
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  }, [sound, position, duration]);

  const handlePlayPause = useCallback(async () => {
    if (!currentMusic || !sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }, [currentMusic, sound, isPlaying]);

  // 处理播放模式切换
  const handlePlayModeChange = () => {
    let newMode = playMode;
    if (playMode === PlayMode.SEQUENCE) {
      newMode = PlayMode.SINGLE;
    } else if (playMode === PlayMode.SINGLE) {
      newMode = PlayMode.RANDOM;
    } else if (playMode === PlayMode.RANDOM) {
      newMode = PlayMode.SEQUENCE;
    }
    setPlayMode(newMode);
    AsyncStorage.setItem(`@music/playMode`, newMode.toString());
  };

  // 处理下一首音乐
  const handleNextMusic = useCallback(async () => {
    if (!currentMusic || musicFiles.length === 0) return;

    switch (playMode) {
      case PlayMode.SINGLE:
        // 单曲循环：重新播放当前歌曲
        if (sound) {
          await sound.setPositionAsync(0);
          await sound.playAsync();
        }
        break;
      case PlayMode.SEQUENCE:
        // 顺序播放：播放下一首歌曲
        const currentIndex = musicFiles.findIndex(file => file.name === currentMusic.name);
        const nextIndex = (currentIndex + 1) % musicFiles.length;
        const nextMusic = musicFiles[nextIndex];
        if (nextMusic) {
          await handlePlayMusic(nextMusic);
        }
        break;
      case PlayMode.RANDOM:
        const unplayedSongs = musicFiles.filter(item => !item.played);
        if (unplayedSongs.length === 0) {
          // 如果所有歌曲都已播放，重置所有歌曲的播放状态
          const resetFiles = musicFiles.map(file => ({
            ...file,
            played: false
          }));
          setMusicFiles(resetFiles);
          // 保存重置后的状态
          await AsyncStorage.setItem(`@music/${title}`, JSON.stringify(resetFiles));
          // 从重置后的列表中随机选择一首非当前播放的歌曲
          const availableSongs = resetFiles.filter(file => file.name !== currentMusic?.name);
          if (availableSongs.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableSongs.length);
            const randomMusic = availableSongs[randomIndex];
            if (randomMusic) {
              handlePlayMusic(randomMusic, resetFiles);
            }
          }
        } else {
          // 从未播放的歌曲中随机选择一首
          const randomIndex = Math.floor(Math.random() * unplayedSongs.length);
          const randomMusic = unplayedSongs[randomIndex];
          if (randomMusic) {
            await handlePlayMusic(randomMusic);
          }
        }
        break;
    }
  }, [currentMusic, sound, playMode, musicFiles]);

  // 创建音频实例
  const createAudioInstance = useCallback(async (uri: string, shouldPlay: boolean = false) => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay },
        (status) => {
          if (status.isLoaded) {
            const currentPosition = formatTime(status.positionMillis);
            // 只有当位置真正发生变化时才更新
            if (currentPosition !== lastPosition.current) {
              lastPosition.current = currentPosition;
              setPosition(currentPosition);
              if (!isDragging.current) {
                setSliderValue(status.positionMillis);
              }
            }
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            // 检查是否播放完成
            if (status.didJustFinish) {
              handleNextMusic();
            }
          }
        },
        true // 启用状态更新回调
      );
      return newSound;
    } catch (error) {
      console.error('Error creating audio instance:', error);
      return null;
    }
  }, [handleNextMusic]);

  // 处理播放音乐
  const handlePlayMusic = async (item: MusicFile, resetFiles?: MusicFile[]) => {
    try {
      // 如果正在播放同一首歌
      if (currentMusic?.name === item.name) {
        if (isPlaying) {
          // 暂停播放
          await sound?.pauseAsync();
          setIsPlaying(false);
        } else {
          // 继续播放
          await sound?.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // 如果有正在播放的音乐，先停止
      if (sound) {
        await sound.unloadAsync();
      }

      // 更新所有音乐的播放状态
      const updatedFiles = (resetFiles || musicFiles).map(file => ({
        ...file,
        played: file.name === item.name ? true : file.played
      }));

      setMusicFiles(updatedFiles);
      setCurrentMusic(item);

      // 创建并播放新的音频实例
      const newSound = await createAudioInstance(item.uri, true);
      if (newSound) {
        setSound(newSound);
        setIsPlaying(true);
      }

      // 保存更新后的状态到 AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(`@music/${title}`, JSON.stringify(updatedFiles)),
        AsyncStorage.setItem(`@music/playing/${title}`, item.name)
      ]);

    } catch (error) {
      console.error('Error playing music:', error);
    }
  };

  const deleteMusicFile = useCallback(async (index: number) => {
    try {
      const updatedFiles = musicFiles.filter((_, i) => i !== index);
      setMusicFiles(updatedFiles);

      // 如果删除的是当前播放的音乐，清除播放状态
      if (currentMusic && currentMusic.name === musicFiles[index].name) {
        setCurrentMusic(null);
        setIsPlaying(false);
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }
        await AsyncStorage.removeItem(`@music/playing/${title}`);
      }

      await AsyncStorage.setItem(`@music/${title}`, JSON.stringify(updatedFiles));
    } catch (error) {
      console.error('Error deleting music file:', error);
    }
  }, [currentMusic, musicFiles, sound, title]);

  // 搜索功能
  const handleSearch = useCallback(() => {
    if (!searchKeyword.trim()) return;

    const searchResults = musicFiles
      .map((file, index) => ({ file, index }))
      .filter(({ file }) =>
        file.name.toLowerCase().includes(searchKeyword.toLowerCase())
      );

    if (searchResults.length === 0) {
      alert('未找到匹配的歌曲');
      return;
    }

    // 找到下一个匹配项
    const nextIndex = searchResults.findIndex(
      ({ index }) => index > currentSearchIndex
    );

    const targetIndex = nextIndex === -1 ? searchResults[0].index : searchResults[nextIndex].index;
    setCurrentSearchIndex(targetIndex);

    // 滚动到目标位置
    flatListRef.current?.scrollToIndex({
      index: targetIndex,
      animated: true,
      viewPosition: 0.5
    });
  }, [searchKeyword, musicFiles, currentSearchIndex]);

  // 重置搜索状态
  const resetSearch = useCallback(() => {
    setSearchKeyword('');
    setCurrentSearchIndex(-1);
  }, []);

  // 加载保存的音乐文件和当前播放状态
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedFiles, currentPlaying, savedPlayMode] = await Promise.all([
          AsyncStorage.getItem(`@music/${title}`),
          AsyncStorage.getItem(`@music/playing/${title}`),
          AsyncStorage.getItem(`@music/playMode`)
        ]);

        if (savedFiles) {
          const files = JSON.parse(savedFiles);
          setMusicFiles(files);

          // 如果有正在播放的音乐，设置当前音乐并加载音频
          if (currentPlaying) {
            const playingMusic = files.find((file: MusicFile) => file.name === currentPlaying);
            if (playingMusic) {
              setCurrentMusic(playingMusic);
              // 加载音频但不自动播放
              const newSound = await createAudioInstance(playingMusic.uri, false);
              if (newSound) {
                setSound(newSound);
                setIsPlaying(false);
              }
            }
          }
        }

        // 加载保存的播放模式
        if (savedPlayMode) {
          setPlayMode(savedPlayMode as PlayMode);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    // 清理函数
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [title]);

  const pickMusicFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const newFiles = result.assets.map(file => ({
        name: file.name,
        uri: file.uri,
        played: false,
      }));

      const updatedFiles = [...musicFiles, ...newFiles];
      setMusicFiles(updatedFiles);

      // 保存到 AsyncStorage
      await AsyncStorage.setItem(`@music/${title}`, JSON.stringify(updatedFiles));
    } catch (error) {
      console.error('Error picking music files:', error);
    }
  };

  // 处理定时器选择
  const handleTimerSelect = useCallback((hours: number) => {
    // 清除现有的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 设置新的定时器
    const milliseconds = hours * 60 * 60 * 1000;
    timerRef.current = setTimeout(() => {
      if (sound && isPlaying) {
        sound.pauseAsync();
        setIsPlaying(false);
      }
      setTimerActive(false);
    }, milliseconds);

    setTimerActive(true);
  }, [sound, isPlaying]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 处理返回按钮
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // 停止音乐播放
      if (sound && isPlaying) {
        sound.pauseAsync();
        setIsPlaying(false);
      }
      // 清除最后点击的 item
      AsyncStorage.removeItem('@myapp/lastClickedItem');
      return false; // 返回 false 让系统继续处理返回事件
    });

    return () => backHandler.remove();
  }, [sound, isPlaying]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: title,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#2775B7',
          },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity
              style={{ width: 24, marginLeft: 15 }}
              onPress={async () => {
                // 停止音乐播放
                if (sound && isPlaying) {
                  await sound.pauseAsync();
                  setIsPlaying(false);
                }
                // 清除最后点击的 item
                await AsyncStorage.removeItem('@myapp/lastClickedItem');
                router.back();
              }}>
              <AntDesign name="arrowleft" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ width: 24, marginRight: 15 }}
              onPress={pickMusicFiles}>
              <AntDesign name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          ref={flatListRef}
          data={musicFiles}
          renderItem={({ item, index }) => (
            <MusicItem
              item={item}
              onPress={handlePlayMusic}
              onDelete={() => deleteMusicFile(index)}
              isCurrent={currentMusic?.name === item.name}
            />
          )}
          keyExtractor={(_, index) => index.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        <View style={styles.playerBarContainer}>
          <PlayerBar
            currentMusic={currentMusic}
            isPlaying={isPlaying}
            position={position}
            duration={duration}
            sliderValue={sliderValue}
            onSliderChange={handleSliderChange}
            onSliderComplete={handleSliderComplete}
            onSeek={handleSeek}
            onPlayPause={handlePlayPause}
            onSearch={() => setSearchVisible(true)}
            isDragging={isDragging}
            playMode={playMode}
            onPlayModeChange={handlePlayModeChange}
            onPlayNext={handleNextMusic}
            onTimerPress={() => setTimerVisible(true)}
            timerActive={timerActive}
          />
        </View>
      </SafeAreaView>

      <SearchModal
        visible={searchVisible}
        onClose={() => {
          setSearchVisible(false);
          resetSearch();
        }}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        onSearch={handleSearch}
      />

      <TimerModal
        visible={timerVisible}
        onClose={() => setTimerVisible(false)}
        onSelectTime={handleTimerSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 90,
  },
  playerBarContainer: {
    backgroundColor: '#2775B7',
    paddingBottom: 0,
  },
});
