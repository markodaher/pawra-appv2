import { Image, Pressable, Text, View } from 'react-native';
import { useApp } from '../../lib/AppContext';
import type { Theme } from '../../types';
import { Icon } from '../Icon';
import { Avatar, TabBar } from '../primitives';

export function ProviderShell({ T, dark, children, tab, onTab, badge }: {
  T: Theme;
  dark: boolean;
  children: React.ReactNode;
  tab: string;
  onTab: (id: string) => void;
  badge?: Record<string, number>;
}) {
  const { selfProvider, providerDisplayPic, unreadNotifCount, unreadChatCount, setNotifCenterOpen } = useApp();
  const name = selfProvider?.name || 'Set up your business';
  return (
    <>
      <View style={{
        paddingHorizontal: 20, paddingTop: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Pressable
          onPress={() => onTab('profile')}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
        >
          {providerDisplayPic ? (
            <Image source={{ uri: providerDisplayPic }} style={{
              width: 40, height: 40, borderRadius: 20,
              borderWidth: 1.5, borderColor: T.hairline,
            }} />
          ) : (
            <Avatar name={selfProvider?.name || '?'} size={40} T={T} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: T.inkMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Provider</Text>
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2 }}>{name}</Text>
          </View>
        </Pressable>
        <View>
          <Pressable onPress={() => setNotifCenterOpen(true)} style={{
            width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
            borderWidth: 1, borderColor: T.hairline,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="bell" size={18} color={T.ink} />
          </Pressable>
          {unreadNotifCount + unreadChatCount > 0 ? (
            <View style={{
              position: 'absolute', top: -3, right: -4,
              minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
              backgroundColor: T.brand, borderWidth: 2, borderColor: T.surface,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700' }}>
                {unreadNotifCount + unreadChatCount > 9 ? '9+' : unreadNotifCount + unreadChatCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      <TabBar
        T={T} dark={dark} active={tab} onChange={onTab} badge={badge}
        tabs={[
          { id: 'inbox', icon: 'inbox', label: 'Inbox' },
          { id: 'schedule', icon: 'calendar', label: 'Schedule' },
          { id: 'services', icon: 'tag', label: 'Services' },
          { id: 'shop', icon: 'bag', label: 'Shop' },
          { id: 'profile', icon: 'user', label: 'Profile' },
        ]}
      />
    </>
  );
}
