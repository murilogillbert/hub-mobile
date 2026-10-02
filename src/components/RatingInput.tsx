import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '@/components/ui/primitives';
import { colors, spacing } from '@/theme/tokens';

const LABELS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'] as const;

/**
 * Nota de 1 a 5 estrelas inteiras — é o que a API do hub aceita em `POST /reviews`. (O app de
 * corridas usa meias estrelas; aqui seria divergir do backend sem ganho.)
 */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Sua nota">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected: value === n, checked: value === n }}
              accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
              hitSlop={6}
              onPress={() => onChange(n)}
              style={styles.star}
            >
              <Icon name={active ? 'star' : 'star-outline'} size={34} color={active ? colors.warning : colors.textSoft} />
            </Pressable>
          );
        })}
      </View>
      {value > 0 ? (
        <AppText variant="small" center>
          {LABELS[value]}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  star: { padding: 2 },
});
