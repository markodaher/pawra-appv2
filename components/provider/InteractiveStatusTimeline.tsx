import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BookingStatus, Theme } from '../../types';

const BOOKING_STEPS: { id: Extract<BookingStatus, 'pending' | 'confirmed' | 'in_progress' | 'completed'>; label: string }[] = [
  { id: 'pending',     label: 'Pending' },
  { id: 'confirmed',   label: 'Confirmed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed',   label: 'Completed' },
];

const BOOKING_NEXT_VERB: Record<string, string> = {
  confirmed: 'accept',
  in_progress: 'start',
  completed: 'complete',
};

export function InteractiveStatusTimeline({
  status, onAdvance, T,
  steps = BOOKING_STEPS,
  nextVerb = BOOKING_NEXT_VERB,
}: {
  status: string;
  onAdvance: (next: string) => void;
  T: Theme;
  /** Optional override — defaults to the booking flow. */
  steps?: { id: string; label: string }[];
  /** Map of next-step-id → verb (e.g. confirmed → "accept"). */
  nextVerb?: Record<string, string>;
}) {
  const STEPS = steps;
  const NEXT_VERB = nextVerb;
  const currentIdx = STEPS.findIndex(s => s.id === status);
  const nextIdx = currentIdx + 1;
  const nextStep = STEPS[nextIdx];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 }}>
        {STEPS.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isNext = i === nextIdx;
          const tappable = isNext;

          const dotBg =
            isPast || isCurrent ? T.brand :
            isNext ? 'transparent' : T.surfaceAlt;
          const dotBorderWidth = isCurrent ? 3 : (isNext ? 2 : 0);
          const dotBorderColor = isCurrent ? T.brandSoft : (isNext ? T.brand : 'transparent');
          const labelColor =
            isPast || isCurrent ? T.ink :
            isNext ? T.brand :
            T.inkMuted;

          return (
            <Fragment key={s.id}>
              <Pressable
                onPress={tappable ? () => onAdvance(s.id) : undefined}
                disabled={!tappable}
                hitSlop={10}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  gap: 6,
                  transform: [{ scale: pressed && tappable ? 0.94 : 1 }],
                  width: 70,
                })}
              >
                <View style={{
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: dotBg,
                  borderWidth: dotBorderWidth,
                  borderColor: dotBorderColor,
                }} />
                <Text style={{
                  fontSize: 9.5, fontWeight: isNext ? '700' : '600',
                  color: labelColor, textAlign: 'center',
                  textTransform: 'uppercase', letterSpacing: 0.3,
                }}>{s.label}</Text>
              </Pressable>
              {i < STEPS.length - 1 ? (
                <View style={{
                  flex: 1, height: 2,
                  backgroundColor: i < currentIdx ? T.brand : T.surfaceAlt,
                  marginTop: 6, // align with dot center (14/2 - 2/2 ≈ 6)
                }} />
              ) : null}
            </Fragment>
          );
        })}
      </View>

      {nextStep ? (
        <View style={{
          marginTop: 12, alignSelf: 'center',
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
          backgroundColor: T.brandSoft,
        }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.brand }} />
          <Text style={{ color: T.brandInk, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>
            Tap "{nextStep.label}" to {NEXT_VERB[nextStep.id]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
