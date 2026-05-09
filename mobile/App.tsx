import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const ANILIST_API = 'https://graphql.anilist.co';
const CACHE_PREFIX = 'cache_';
const TRENDING_CACHE_KEY = 'trending_safe';
const LIST_KEY = 'user_anime_list';
const SETTINGS_KEY = 'user_settings';
const CACHE_TTL = 3600;

type Screen = 'HOME' | 'DETAILS' | 'LIST' | 'SETTINGS';
type UserAnimeStatus = 'WATCHED' | 'PLAN_TO_WATCH' | 'WATCHING' | 'DROPPED';
type SortType = 'DATE_ADDED' | 'RATING' | 'TITLE';

interface AnimeSummary {
  id: number;
  title: string;
  image: string;
  rating: number;
  episodes: number | null;
  status: string;
}

interface AnimeDetails extends AnimeSummary {
  description: string | null;
  genres: string[];
  studios: string[];
  seasonYear: number | null;
  season: string | null;
}

interface RawAniListMedia {
  id: number;
  title?: {
    romaji?: string | null;
    english?: string | null;
  };
  coverImage?: {
    large?: string | null;
    medium?: string | null;
  };
  description?: string | null;
  episodes?: number | null;
  meanScore?: number | null;
  status?: string | null;
  genres?: string[] | null;
  studios?: {
    nodes?: Array<{
      name: string;
    }>;
  };
  seasonYear?: number | null;
  season?: string | null;
}

interface UserAnime {
  animeId: number;
  animeTitle: string;
  animeImage: string;
  status: UserAnimeStatus;
  userRating: number | null;
  episodesWatched: number | null;
  dateAdded: number;
}

interface UserSettings {
  darkMode: boolean;
  sortBy: SortType;
  defaultStatus: UserAnimeStatus;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  darkMode: true,
  sortBy: 'DATE_ADDED',
  defaultStatus: 'WATCHING',
};

const TRENDING_QUERY = `
  query {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
        id
        title { romaji english }
        coverImage { large medium }
        episodes
        meanScore
        status
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, search: $search, isAdult: false) {
        id
        title { romaji english }
        coverImage { large medium }
        episodes
        meanScore
        status
      }
    }
  }
`;

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      coverImage { large medium }
      description
      episodes
      meanScore
      status
      genres
      studios(isMain: true) { nodes { name } }
      seasonYear
      season
    }
  }
`;

const stripHtml = (value: string | null) => (value ?? 'No description').replace(/<[^>]+>/g, '');

const readJson = async <T,>(key: string): Promise<T | null> => {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
};

const writeJson = async <T,>(key: string, value: T) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const cacheData = async <T,>(key: string, data: T, ttl = CACHE_TTL) => {
  await writeJson<CachedData<T>>(`${CACHE_PREFIX}${key}`, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

const getCachedData = async <T,>(key: string): Promise<{ data: T; isValid: boolean } | null> => {
  const cached = await readJson<CachedData<T>>(`${CACHE_PREFIX}${key}`);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > cached.ttl * 1000;
  return { data: cached.data, isValid: !isExpired };
};

const toSummary = (anime: RawAniListMedia): AnimeSummary => ({
  id: anime.id,
  title: anime.title?.romaji || anime.title?.english || 'Unknown',
  image: anime.coverImage?.large || anime.coverImage?.medium || '',
  rating: anime.meanScore || 0,
  episodes: anime.episodes ?? null,
  status: anime.status || 'UNKNOWN',
});

const fetchAniList = async <T,>(query: string, variables?: Record<string, unknown>): Promise<T> => {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error('AniList request failed');
  }

  return response.json();
};

const getSettings = async () => (await readJson<UserSettings>(SETTINGS_KEY)) ?? DEFAULT_SETTINGS;
const saveSettings = async (settings: Partial<UserSettings>) => {
  const current = await getSettings();
  await writeJson(SETTINGS_KEY, { ...current, ...settings });
};

const getUserList = async () => (await readJson<UserAnime[]>(LIST_KEY)) ?? [];
const saveUserList = async (list: UserAnime[]) => writeJson(LIST_KEY, list);

const getTrendingAnime = async () => {
  try {
    const cached = await getCachedData<AnimeSummary[]>(TRENDING_CACHE_KEY);
    if (cached?.isValid) return { data: cached.data, isCached: true };

    const response = await fetchAniList<{ data: { Page: { media: RawAniListMedia[] } } }>(TRENDING_QUERY);
    const data = response.data.Page.media.map(toSummary);
    await cacheData(TRENDING_CACHE_KEY, data);
    return { data, isCached: false };
  } catch (error) {
    const cached = await getCachedData<AnimeSummary[]>(TRENDING_CACHE_KEY);
    if (cached) return { data: cached.data, isCached: true };
    throw error;
  }
};

const searchAnime = async (search: string) => {
  const cacheKey = `search_${search.toLowerCase()}`;
  try {
    const cached = await getCachedData<AnimeSummary[]>(cacheKey);
    if (cached?.isValid) return { data: cached.data, isCached: true };

    const response = await fetchAniList<{ data: { Page: { media: RawAniListMedia[] } } }>(SEARCH_QUERY, { search });
    const data = response.data.Page.media.map(toSummary);
    await cacheData(cacheKey, data, 600);
    return { data, isCached: false };
  } catch {
    const cached = await getCachedData<AnimeSummary[]>(cacheKey);
    return { data: cached?.data ?? [], isCached: Boolean(cached) };
  }
};

const getAnimeDetails = async (id: number) => {
  const cacheKey = `details_${id}`;
  try {
    const cached = await getCachedData<AnimeDetails>(cacheKey);
    if (cached?.isValid) return { data: cached.data, isCached: true };

    const response = await fetchAniList<{ data: { Media: RawAniListMedia } }>(DETAILS_QUERY, { id });
    const media = response.data.Media;
    const data: AnimeDetails = {
      ...toSummary(media),
      description: media.description ?? null,
      genres: media.genres ?? [],
      studios: media.studios?.nodes?.map((studio: { name: string }) => studio.name) ?? [],
      seasonYear: media.seasonYear ?? null,
      season: media.season ?? null,
    };
    await cacheData(cacheKey, data);
    return { data, isCached: false };
  } catch (error) {
    const cached = await getCachedData<AnimeDetails>(cacheKey);
    if (cached) return { data: cached.data, isCached: true };
    throw error;
  }
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [anime, setAnime] = useState<AnimeSummary[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeDetails | null>(null);
  const [userList, setUserList] = useState<UserAnime[]>([]);
  const [activeStatus, setActiveStatus] = useState<'ALL' | UserAnimeStatus>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [userRating, setUserRating] = useState('');
  const [userStatus, setUserStatus] = useState<UserAnimeStatus>('WATCHING');

  const theme = settings.darkMode ? darkTheme : lightTheme;

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    const savedSettings = await getSettings();
    const savedList = await getUserList();
    setSettings(savedSettings);
    setUserStatus(savedSettings.defaultStatus);
    setUserList(savedList);
    await loadTrending();
  };

  const loadTrending = async () => {
    setLoading(true);
    try {
      const result = await getTrendingAnime();
      setAnime(result.data);
      setIsCached(result.isCached);
    } catch {
      Alert.alert('Error', 'Could not load anime.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      await loadTrending();
      return;
    }

    setLoading(true);
    const result = await searchAnime(query.trim());
    setAnime(result.data);
    setIsCached(result.isCached);
    setLoading(false);
  };

  const openDetails = async (id: number) => {
    setScreen('DETAILS');
    setSelectedAnime(null);
    setLoading(true);
    try {
      const result = await getAnimeDetails(id);
      const saved = userList.find((item) => item.animeId === id);
      setSelectedAnime(result.data);
      setIsCached(result.isCached);
      setUserStatus(saved?.status ?? settings.defaultStatus);
      setUserRating(saved?.userRating?.toString() ?? '');
    } catch {
      Alert.alert('Error', 'Could not load details.');
      setScreen('HOME');
    } finally {
      setLoading(false);
    }
  };

  const saveToList = async () => {
    if (!selectedAnime) return;

    const entry: UserAnime = {
      animeId: selectedAnime.id,
      animeTitle: selectedAnime.title,
      animeImage: selectedAnime.image,
      status: userStatus,
      userRating: userRating ? Number(userRating) : null,
      episodesWatched: null,
      dateAdded: userList.find((item) => item.animeId === selectedAnime.id)?.dateAdded ?? Date.now(),
    };

    const next = userList.some((item) => item.animeId === entry.animeId)
      ? userList.map((item) => (item.animeId === entry.animeId ? entry : item))
      : [...userList, entry];

    setUserList(next);
    await saveUserList(next);
    Alert.alert('Saved', `${entry.animeTitle} was saved to your list.`);
  };

  const removeFromList = async (animeId: number) => {
    const next = userList.filter((item) => item.animeId !== animeId);
    setUserList(next);
    await saveUserList(next);
  };

  const updateSettings = async (next: Partial<UserSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    await saveSettings(next);
  };

  const sortedUserList = useMemo(() => {
    const filtered = activeStatus === 'ALL' ? userList : userList.filter((item) => item.status === activeStatus);
    return [...filtered].sort((a, b) => {
      if (settings.sortBy === 'RATING') return (b.userRating ?? 0) - (a.userRating ?? 0);
      if (settings.sortBy === 'TITLE') return a.animeTitle.localeCompare(b.animeTitle);
      return b.dateAdded - a.dateAdded;
    });
  }, [activeStatus, settings.sortBy, userList]);

  return (
    <SafeAreaView style={[styles.app, { backgroundColor: theme.background }]}>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      <View style={[styles.nav, { backgroundColor: theme.nav }]}>
        <Text style={styles.logo}>Anime Tracker</Text>
      </View>

      {screen !== 'DETAILS' && (
        <View style={styles.tabs}>
          {(['HOME', 'LIST', 'SETTINGS'] as Screen[]).map((item) => (
            <Pressable
              key={item}
              style={[styles.tab, screen === item && styles.activeTab]}
              onPress={() => setScreen(item)}
            >
              <Text style={styles.tabText}>{item === 'LIST' ? 'My List' : item[0] + item.slice(1).toLowerCase()}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {screen === 'HOME' && (
        <View style={styles.page}>
          <Text style={[styles.title, { color: theme.text }]}>Discover Anime</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Explore AniList and build your collection</Text>
          {isCached && <Text style={styles.cached}>Offline / Cached View</Text>}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
              placeholder="Search anime..."
              placeholderTextColor={theme.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
            />
            <Pressable style={styles.primaryButton} onPress={handleSearch}>
              <Text style={styles.buttonText}>Search</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color="#9d18f6" size="large" />
          ) : (
            <FlatList
              data={anime}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.cardRow}
              renderItem={({ item }) => (
                <Pressable style={[styles.posterCard, { backgroundColor: theme.card }]} onPress={() => openDetails(item.id)}>
                  <Image source={{ uri: item.image }} style={styles.poster} />
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}

      {screen === 'DETAILS' && (
        <ScrollView style={styles.page}>
          <Pressable style={styles.secondaryButton} onPress={() => setScreen('HOME')}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          {loading || !selectedAnime ? (
            <ActivityIndicator color="#9d18f6" size="large" />
          ) : (
            <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
              <Image source={{ uri: selectedAnime.image }} style={styles.detailsImage} />
              <Text style={[styles.title, { color: theme.text }]}>{selectedAnime.title}</Text>
              {isCached && <Text style={styles.cached}>Cached</Text>}
              <Text style={[styles.meta, { color: theme.text }]}>Rating: {selectedAnime.rating}/100</Text>
              <Text style={[styles.meta, { color: theme.text }]}>Episodes: {selectedAnime.episodes ?? 'Unknown'}</Text>
              <Text style={[styles.meta, { color: theme.text }]}>Status: {selectedAnime.status}</Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
              <Text style={[styles.description, { color: theme.muted }]}>{stripHtml(selectedAnime.description)}</Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your List</Text>
              <View style={styles.statusRow}>
                {(['WATCHING', 'WATCHED', 'PLAN_TO_WATCH', 'DROPPED'] as UserAnimeStatus[]).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.statusPill, userStatus === status && styles.activeStatusPill]}
                    onPress={() => setUserStatus(status)}
                  >
                    <Text style={styles.statusText}>{status.replaceAll('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Your rating 0-10"
                placeholderTextColor={theme.muted}
                value={userRating}
                keyboardType="numeric"
                onChangeText={setUserRating}
              />
              <Pressable style={styles.primaryButton} onPress={saveToList}>
                <Text style={styles.buttonText}>Save to My List</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {screen === 'LIST' && (
        <View style={styles.page}>
          <Text style={[styles.title, { color: theme.text }]}>My Anime List</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['ALL', 'WATCHING', 'WATCHED', 'PLAN_TO_WATCH', 'DROPPED'] as Array<'ALL' | UserAnimeStatus>).map((status) => (
              <Pressable
                key={status}
                style={[styles.statusPill, activeStatus === status && styles.activeStatusPill]}
                onPress={() => setActiveStatus(status)}
              >
                <Text style={styles.statusText}>{status.replaceAll('_', ' ')}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <FlatList
            data={sortedUserList}
            keyExtractor={(item) => item.animeId.toString()}
            renderItem={({ item }) => (
              <Pressable style={[styles.listItem, { backgroundColor: theme.card }]} onPress={() => openDetails(item.animeId)}>
                <Image source={{ uri: item.animeImage }} style={styles.listImage} />
                <View style={styles.listText}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.animeTitle}</Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>{item.status.replaceAll('_', ' ')}</Text>
                  {item.userRating !== null && <Text style={[styles.meta, { color: theme.muted }]}>Rating: {item.userRating}/10</Text>}
                </View>
                <Pressable onPress={() => removeFromList(item.animeId)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={[styles.subtitle, { color: theme.muted }]}>No anime saved yet.</Text>}
          />
        </View>
      )}

      {screen === 'SETTINGS' && (
        <ScrollView style={styles.page}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
            <View style={styles.settingRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Dark Mode</Text>
              <Switch value={settings.darkMode} onValueChange={(darkMode) => updateSettings({ darkMode })} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Default Sort</Text>
            <View style={styles.statusRow}>
              {(['DATE_ADDED', 'RATING', 'TITLE'] as SortType[]).map((sortBy) => (
                <Pressable
                  key={sortBy}
                  style={[styles.statusPill, settings.sortBy === sortBy && styles.activeStatusPill]}
                  onPress={() => updateSettings({ sortBy })}
                >
                  <Text style={styles.statusText}>{sortBy.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Default Status</Text>
            <View style={styles.statusRow}>
              {(['WATCHING', 'WATCHED', 'PLAN_TO_WATCH', 'DROPPED'] as UserAnimeStatus[]).map((defaultStatus) => (
                <Pressable
                  key={defaultStatus}
                  style={[styles.statusPill, settings.defaultStatus === defaultStatus && styles.activeStatusPill]}
                  onPress={() => updateSettings({ defaultStatus })}
                >
                  <Text style={styles.statusText}>{defaultStatus.replaceAll('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.dangerButton}
              onPress={async () => {
                await AsyncStorage.clear();
                setUserList([]);
                setSettings(DEFAULT_SETTINGS);
                Alert.alert('Done', 'All local data was cleared.');
              }}
            >
              <Text style={styles.buttonText}>Delete All Local Data</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const darkTheme = {
  background: '#201633',
  card: '#563077',
  muted: '#c9bad8',
  nav: '#101022',
  text: '#ffffff',
};

const lightTheme = {
  background: '#ebe3f6',
  card: '#f6f0ff',
  muted: '#463456',
  nav: '#101022',
  text: '#160d24',
};

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  nav: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  logo: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#1c1230',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  activeTab: {
    backgroundColor: '#9d18f6',
  },
  tabText: {
    color: '#fff',
    fontWeight: '800',
  },
  page: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  cached: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 216, 77, 0.18)',
    color: '#ffd84d',
    fontWeight: '800',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#9d18f6',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderColor: '#9d18f6',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#9d18f6',
    fontWeight: '800',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '900',
  },
  cardRow: {
    gap: 12,
  },
  posterCard: {
    borderRadius: 10,
    flex: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  poster: {
    aspectRatio: 0.72,
    width: '100%',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    padding: 10,
  },
  detailsCard: {
    borderRadius: 12,
    gap: 10,
    padding: 16,
  },
  detailsImage: {
    alignSelf: 'center',
    aspectRatio: 0.7,
    borderRadius: 10,
    width: '65%',
  },
  meta: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  statusPill: {
    backgroundColor: 'rgba(157, 24, 246, 0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeStatusPill: {
    backgroundColor: '#9d18f6',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  filterScroll: {
    marginBottom: 12,
  },
  listItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 10,
  },
  listImage: {
    borderRadius: 8,
    height: 96,
    width: 68,
  },
  listText: {
    flex: 1,
  },
  removeText: {
    color: '#ff344d',
    fontWeight: '900',
  },
  settingsCard: {
    borderRadius: 12,
    gap: 10,
    padding: 16,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#ff344d',
    borderRadius: 12,
    marginTop: 20,
    padding: 14,
  },
});
