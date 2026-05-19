import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useEnterAnim } from '../../lib/transitions';
import type { Theme } from '../../types';
import { Icon } from '../Icon';

const SECTIONS = [
  {
    icon: 'user',
    title: 'Who we are',
    body: 'Pawra is Lebanon\'s pet services platform, operated from Beirut. We are the data controller for all personal data collected through this app.\n\nContact: privacy@pawra.app',
  },
  {
    icon: 'shield',
    title: 'Data we collect',
    body: 'Under Article 4 of Law 81/2018 (data minimisation), we collect only what is needed:\n\n· Name, email, and date of birth\n· Pet details: species, breed, age, weight, blood type, notes, photo\n· Address pins you drop on the map (no background GPS)\n· Booking and order history\n· Payment metadata — last 4 digits and card brand only, never the full number\n· Device ID for push notifications',
  },
  {
    icon: 'list',
    title: 'How we use your data',
    body: 'Lawful bases under Article 7 of Law 81/2018:\n\n· Contract performance: to match you with providers, process bookings and orders, and share your pet\'s passport with the provider you book\n· Legitimate interest: improving features and detecting fraud\n· Legal obligation: complying with Lebanese judicial orders\n· Consent (marketing only): you may withdraw at any time',
  },
  {
    icon: 'send',
    title: 'Sharing your data',
    body: 'We do not sell your data. We share only:\n\n· With your booked provider — name, pet info, address, time\n· With Supabase (cloud database, US) under a Data Processing Agreement\n· With payment processors under PCI-DSS standards\n· When required by a Lebanese court or Public Prosecutor',
  },
  {
    icon: 'check-circle',
    title: 'Your rights',
    body: 'Articles 10–14 of Law 81/2018 give you the right to:\n\n· Access a full copy of your data\n· Correct inaccurate information\n· Delete your account and data (within 90 days)\n· Object to processing based on legitimate interest\n· Receive your data in a portable format\n\nEmail privacy@pawra.app — we respond within 30 days.',
  },
  {
    icon: 'clock',
    title: 'Retention',
    body: 'We keep your data while your account is active. After deletion, personal data is removed within 90 days. Transaction records may be retained for up to 10 years as required by the Lebanese Code of Commerce.',
  },
  {
    icon: 'lock',
    title: 'Security',
    body: 'Measures applied under Article 17 of Law 81/2018:\n\n· All data transmitted over HTTPS / TLS 1.3\n· Database encrypted at rest (AES-256)\n· Row-level security — users access only their own data\n· ID documents in a restricted-access storage bucket\n· No full card numbers stored on Pawra servers',
  },
  {
    icon: 'settings',
    title: 'Changes & complaints',
    body: 'We will notify you in-app at least 14 days before any material change.\n\nTo lodge a complaint, contact privacy@pawra.app first. You may also refer the matter to the Ministry of Economy and Trade (Consumer Protection Directorate) or the competent Lebanese court.',
  },
];

export function PrivacySheet({ T, onClose }: { T: Theme; onClose: () => void }) {
  const anim = useEnterAnim('right');

  return (
    <Animated.View style={[{ position: 'absolute', inset: 0, zIndex: 90, backgroundColor: T.bg }, anim.sheet]}>

      {/* Header */}
      <View style={{
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Pressable onPress={onClose} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevron-left" size={20} color={T.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Profile
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3, marginTop: 2 }}>
            Privacy Policy
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Law badge */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          padding: 14, borderRadius: 16,
          backgroundColor: T.brandSoft, borderWidth: 1, borderColor: T.hairline,
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="shield" size={18} color={T.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: T.brandInk, letterSpacing: -0.2 }}>
              Lebanese Republic · Law 81/2018
            </Text>
            <Text style={{ fontSize: 12, color: T.brandInk, opacity: 0.75, marginTop: 2 }}>
              Last updated 1 May 2026 · Applies to all Pawra users in Lebanon
            </Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((s, i) => (
          <View key={i} style={{
            padding: 14, borderRadius: 16,
            backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10, backgroundColor: T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={s.icon} size={16} color={T.ink} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2, flex: 1 }}>
                {s.title}
              </Text>
            </View>
            <Text style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 21 }}>
              {s.body}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <View style={{
          padding: 14, borderRadius: 16,
          backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
          alignItems: 'center', gap: 4,
        }}>
          <Text style={{ fontSize: 12.5, color: T.inkMuted, textAlign: 'center', lineHeight: 19 }}>
            Pawra · Beirut, Lebanon{'\n'}
            privacy@pawra.app
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
