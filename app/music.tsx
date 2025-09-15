import MusicItem from '@/components/MusicItem';
import PlayerBar, { formatTime, PlayMode } from '@/components/PlayerBar';
import SearchModal from '@/components/SearchModal';
import TimerModal from '@/components/TimerModal';
import LocalStorage from '@/utils/storage';
import TrackPlayerService from '@/utils/TrackPlayerService';
import AntDesign from '@expo/vector-icons/AntDesign';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, FlatList, NativeModules, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer, { Event, State, usePlaybackState, useProgress } from 'react-native-track-player';

const { FilePathModule } = NativeModules;

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderPosition, setSliderPosition] = useState('00:00');
  // 总时长
  const [musicDuration, setMusicDuration] = useState(0);
  // 滑块当前值
  const [sliderValue, setSliderValue] = useState(0);
  const isDragging = useRef(false);
  const lastPosition = useRef("00:00");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const flatListRef = useRef<FlatList>(null);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.SEQUENCE);
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackPlayerService = useRef(TrackPlayerService.getInstance());
  const { position, duration } = useProgress(500);
  const playbackState = usePlaybackState();

  // 更新进度（替代 setDuration + setPosition）
  useEffect(() => {
    if (duration === 0 || position === duration) return;
    setMusicDuration(duration); // 转成毫秒
    setSliderPosition(formatTime(position));

    if (!isDragging.current) {
      savePostion(position);
    }
  }, [position, duration]);

  // 播放状态（替代 setIsPlaying）
  useEffect(() => {
    setIsPlaying(playbackState.state === State.Playing);
    if (playbackState.state === State.Ended) {
      handleNextMusic();
    }
  }, [playbackState]);

  // 锁屏通知栏按钮控制
  useEffect(() => {
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
      await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
      await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
      // 这里可以调用你的下一首逻辑
      console.log('Remote next pressed');
      await handleNextMusic();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
      // 同上，需要自己实现逻辑
    });
  }, [])

  // 保存进度
  const savePostion = (value: number) => {
    setSliderValue(value);
    LocalStorage.setItem(`@music/sliderValue/${title}`, value + '');
  }

  // 处理进度条拖动
  const handleSliderChange = (value: number) => {
    setSliderValue(value);
  };

  // 处理进度条拖动完成
  const handleSliderComplete = useCallback(async (value: number) => {
    try {
      await TrackPlayer.seekTo(value);
      const time = formatTime(value);
      lastPosition.current = time;
      setSliderPosition(time);
      savePostion(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, []);

  // 处理快进快退
  const handleSeek = useCallback(async (seconds: number) => {
    try {
      const newPosition = Math.max(0, Math.min(sliderValue + seconds, musicDuration));
      await TrackPlayer.seekTo(newPosition);
      setSliderPosition(formatTime(newPosition));
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [sliderValue, musicDuration]);

  // 处理播放暂停
  const handlePlayPause = useCallback(async () => {
    if (!currentMusic) return;

    try {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }, [currentMusic, isPlaying]);

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
    LocalStorage.setItem(`@music/playMode`, newMode.toString());
  };

  // 处理下一首音乐
  const handleNextMusic = async () => {
    console.log('handleNextMusic', currentMusic, musicFiles.length);
    if (!currentMusic || musicFiles.length === 0) return;

    switch (playMode) {
      case PlayMode.SINGLE:
        // 单曲循环：重新播放当前歌曲
        try {
          await TrackPlayer.seekTo(0);
          await TrackPlayer.play();
        } catch (error) {
          console.error('Error restarting track:', error);
        }
        break;
      case PlayMode.SEQUENCE:
        // 顺序播放：播放下一首歌曲
        const currentIndex = musicFiles.findIndex(file => file.name === currentMusic.name);
        const nextIndex = (currentIndex + 1) % musicFiles.length;
        const nextMusic = musicFiles[nextIndex];
        if (nextMusic) {
          console.log('nextMusic', nextMusic);
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
          LocalStorage.setItem(`@music/${title}`, JSON.stringify(resetFiles));
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
  };

  // 创建音频实例
  const createAudioInstance = useCallback(async (uri: string, shouldPlay: boolean = false) => {
    try {
      await TrackPlayer.reset();
      const fileName = decodeURIComponent(uri).split('/').pop() || 'Unknown';
      await TrackPlayer.add({
        url: uri,
        title: fileName.split(' - ')[1],
        artist: fileName.split(' - ')[0],
        duration: 0, // 实际时长需要从文件获取
      });
      if (shouldPlay) {
        await TrackPlayer.play();
      }
      return true;
    } catch (error) {
      console.error('Error creating audio instance:', error);
      return false;
    }
  }, []);

  // 处理播放音乐
  const handlePlayMusic = async (item: MusicFile, resetFiles?: MusicFile[]) => {
    try {
      // 如果正在播放同一首歌
      if (currentMusic?.name === item.name) {
        if (isPlaying) {
          // 暂停播放
          await TrackPlayer.pause();
        } else {
          // 继续播放
          await TrackPlayer.play();
        }
        return;
      }

      // 如果有正在播放的音乐，先停止
      try {
        await TrackPlayer.stop();
      } catch (error) {
        console.error('Error stopping track:', error);
      }

      // 更新所有音乐的播放状态
      const updatedFiles = (resetFiles || musicFiles).map(file => ({
        ...file,
        played: file.name === item.name ? true : file.played
      }));

      setMusicFiles(updatedFiles);
      setCurrentMusic(item);

      // 创建并播放新的音频实例
      await createAudioInstance(item.uri, true);

      // 保存更新后的状态到 LocalStorage
      await Promise.all([
        LocalStorage.setItem(`@music/${title}`, JSON.stringify(updatedFiles)),
        LocalStorage.setItem(`@music/playing/${title}`, item.name)
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
        try {
          await TrackPlayer.stop();
        } catch (error) {
          console.error('Error stopping track:', error);
        }
        LocalStorage.removeItem(`@music/playing/${title}`);
      }

      LocalStorage.setItem(`@music/${title}`, JSON.stringify(updatedFiles));
    } catch (error) {
      console.error('Error deleting music file:', error);
    }
  }, [currentMusic, musicFiles, title]);

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

    const initPlayer = async (currentPlaying: string | null, files: any) => {
      // 如果有正在播放的音乐，设置当前音乐并加载音频
      if (!currentPlaying) return;
      const playingMusic = files.find((file: MusicFile) => file.name === currentPlaying);
      if (!playingMusic) return;
      setCurrentMusic(playingMusic);
      // 加载音频但不自动播放
      const res = await createAudioInstance(playingMusic.uri, false);
      if (!res) return;

      // 加载播放的进度
      const value = LocalStorage.getItem(`@music/sliderValue/${title}`);
      if (!value || value === '0') return;
      const p = parseFloat(value);
      setSliderValue(p);
      await TrackPlayer.seekTo(p);
    }

    const loadData = async () => {
      try {
        await trackPlayerService.current.initialize();
        const [savedFiles, currentPlaying, savedPlayMode] = await Promise.all([
          LocalStorage.getItem(`@music/${title}`),
          LocalStorage.getItem(`@music/playing/${title}`),
          LocalStorage.getItem(`@music/playMode`)
        ]);

        // 加载保存的音乐文件
        if (savedFiles) {
          const files = JSON.parse(savedFiles);
          setMusicFiles(files);
          initPlayer(currentPlaying, files);
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
      // 在清理函数中不能使用 async/await，所以使用同步方式
      TrackPlayer.stop();
    };
  }, [title]);

  // 选择音乐文件
  const pickMusicFiles = async () => {
    try {
      // 用户选择文件夹
      const folderUri = await FilePathModule.pickFolder();

      // 遍历该文件夹下的所有文件
      const filesJson = await FilePathModule.listFilesInFolder(folderUri);
      const files: any[] = JSON.parse(filesJson);

      const newFiles = files.map((file) => ({
        name: file.name || '',
        uri: file.uri,
        played: false,
      }));

      const updatedFiles = [...musicFiles, ...newFiles];
      setMusicFiles(updatedFiles);

      // // 保存到 LocalStorage
      LocalStorage.setItem(`@music/${title}`, JSON.stringify(updatedFiles));
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
    const milliseconds = hours * 60 * 60;
    timerRef.current = setTimeout(async () => {
      if (isPlaying) {
        try {
          await TrackPlayer.pause();
        } catch (error) {
          console.error('Error pausing track:', error);
        }
      }
      setTimerActive(false);
    }, milliseconds);

    setTimerActive(true);
  }, [isPlaying]);

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
      // 返回时暂停音乐
      if (isPlaying) {
        const pauseMusic = async () => {
          try {
            await TrackPlayer.pause();
          } catch (error) {
            console.error('Error pausing track:', error);
          }
        };
        pauseMusic();
      }
      // 清除最后点击的 item
      LocalStorage.removeItem('@myapp/lastClickedItem');
      return false; // 返回 false 让系统继续处理返回事件
    });

    return () => backHandler.remove();
  }, [isPlaying]);

  // 处理应用状态变化
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && currentMusic) {
        // 如果应用从后台回到前台，且有音乐实例和当前音乐，恢复播放状态
        const checkAndResume = async () => {
          try {
            const status = await TrackPlayer.getState();
            if (status === State.Paused || status === State.Ready) {
              await TrackPlayer.play();
            }
          } catch (error) {
            console.error('Error checking sound status:', error);
          }
        };
        checkAndResume();
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [isPlaying, currentMusic]);

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
                if (isPlaying) {
                  try {
                    await TrackPlayer.pause();
                  } catch (error) {
                    console.error('Error pausing track:', error);
                  }
                }
                // 清除最后点击的 item
                LocalStorage.removeItem('@myapp/lastClickedItem');
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
            position={sliderPosition}
            duration={musicDuration}
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
