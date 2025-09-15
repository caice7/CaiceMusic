import TrackPlayer, {
  Capability,
  RepeatMode,
  State
} from 'react-native-track-player';

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration?: number;
}

class TrackPlayerService {
  private static instance: TrackPlayerService;
  private isInitialized = false;

  private constructor() { }

  static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
      });

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing TrackPlayer:', error);
      throw error;
    }
  }

  async addTracks(tracks: Track[]): Promise<void> {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
    } catch (error) {
      console.error('Error adding tracks:', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error('Error playing:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Error pausing:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await TrackPlayer.stop();
    } catch (error) {
      console.error('Error stopping:', error);
      throw error;
    }
  }

  async seekTo(position: number): Promise<void> {
    try {
      await TrackPlayer.seekTo(position);
    } catch (error) {
      console.error('Error seeking:', error);
      throw error;
    }
  }

  async skipToNext(): Promise<void> {
    try {
      await TrackPlayer.skipToNext();
    } catch (error) {
      console.error('Error skipping to next:', error);
      throw error;
    }
  }

  async skipToPrevious(): Promise<void> {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (error) {
      console.error('Error skipping to previous:', error);
      throw error;
    }
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    try {
      await TrackPlayer.setRepeatMode(mode);
    } catch (error) {
      console.error('Error setting repeat mode:', error);
      throw error;
    }
  }

  async getCurrentTrack(): Promise<Track | null> {
    try {
      const trackIndex = await TrackPlayer.getCurrentTrack();
      if (trackIndex !== null) {
        const trackData = await TrackPlayer.getTrack(trackIndex);
        if (trackData && trackData.url) {
          // 转换为我们的 Track 接口
          return {
            id: trackData.id || trackIndex.toString(),
            url: trackData.url,
            title: trackData.title || 'Unknown Title',
            artist: trackData.artist || 'Unknown Artist',
            duration: trackData.duration,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting current track:', error);
      return null;
    }
  }

  async getState(): Promise<State> {
    try {
      return await TrackPlayer.getState();
    } catch (error) {
      console.error('Error getting state:', error);
      return State.None;
    }
  }

  async getPosition(): Promise<number> {
    try {
      return await TrackPlayer.getPosition();
    } catch (error) {
      console.error('Error getting position:', error);
      return 0;
    }
  }

  async getDuration(): Promise<number> {
    try {
      return await TrackPlayer.getDuration();
    } catch (error) {
      console.error('Error getting duration:', error);
      return 0;
    }
  }

  async skipToTrack(index: number): Promise<void> {
    try {
      await TrackPlayer.skip(index);
    } catch (error) {
      console.error('Error skipping to track:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      await TrackPlayer.reset();
      this.isInitialized = false;
    } catch (error) {
      console.error('Error destroying TrackPlayer:', error);
      throw error;
    }
  }
}

export default TrackPlayerService; 