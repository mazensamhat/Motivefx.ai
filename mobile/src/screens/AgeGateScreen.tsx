import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LEGAL } from "../config";
import { colors } from "../theme";

interface Props {
  onAccepted: () => void;
}

const MIN_AGE = 18;

/**
 * Birth-year age assurance on first launch (before auth).
 * Justifies Age Rating "In-App Controls" / age assurance for sports-betting modules.
 */
export function AgeGateScreen({ onAccepted }: Props) {
  const currentYear = new Date().getFullYear();
  const [birthYear, setBirthYear] = useState("");
  const [declined, setDeclined] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);

  const yearNum = useMemo(() => {
    if (!/^\d{4}$/.test(birthYear.trim())) return NaN;
    return Number.parseInt(birthYear.trim(), 10);
  }, [birthYear]);

  const age = Number.isFinite(yearNum) ? currentYear - yearNum : null;
  const canContinue =
    age !== null &&
    age >= MIN_AGE &&
    yearNum <= currentYear &&
    yearNum >= currentYear - 100;

  function tryContinue() {
    if (!canContinue) {
      if (age !== null && age < MIN_AGE) setTooYoung(true);
      return;
    }
    onAccepted();
  }

  if (declined || tooYoung) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access restricted</Text>
        <Text style={styles.body}>
          MotiveFX.AI includes sports-betting and event-market intelligence modules. You must be{" "}
          {MIN_AGE} or older to use this app.
        </Text>
        <Text style={styles.hint}>Close the app or enter a birth year that confirms you are 18+.</Text>
        {!declined && (
          <Pressable style={styles.button} onPress={() => setTooYoung(false)}>
            <Text style={styles.buttonText}>Enter a different birth year</Text>
          </Pressable>
        )}
        {declined && (
          <Pressable style={styles.button} onPress={() => setDeclined(false)}>
            <Text style={styles.buttonText}>Go back</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>MotiveFX.AI</Text>
      <Text style={styles.title}>Age verification</Text>
      <Text style={styles.body}>
        This app includes gambling-adjacent sports betting and prediction-market intelligence. Enter
        your <Text style={styles.strong}>birth year</Text> to confirm you are at least{" "}
        <Text style={styles.strong}>{MIN_AGE} years old</Text> and that this content is legal where
        you live.
      </Text>

      <Text style={styles.label}>Birth year</Text>
      <TextInput
        style={styles.input}
        value={birthYear}
        onChangeText={(t) => {
          setBirthYear(t.replace(/\D/g, "").slice(0, 4));
          setTooYoung(false);
        }}
        placeholder={`e.g. ${currentYear - 25}`}
        placeholderTextColor={colors.dim}
        keyboardType="number-pad"
        maxLength={4}
        accessibilityLabel="Birth year"
      />
      {age !== null && age < MIN_AGE && birthYear.length === 4 && (
        <Text style={styles.errorHint}>You must be {MIN_AGE} or older to continue.</Text>
      )}

      <Pressable
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        onPress={tryContinue}
        disabled={!canContinue}
      >
        <Text style={[styles.buttonText, !canContinue && styles.buttonTextDisabled]}>Continue</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => setDeclined(true)}>
        <Text style={styles.secondaryText}>I am under {MIN_AGE}</Text>
      </Pressable>
      <Text style={styles.legal}>
        See our{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)}>
          Terms
        </Text>{" "}
        and{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.privacy)}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 28,
    justifyContent: "center",
  },
  brand: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: 20,
  },
  strong: { color: colors.text, fontWeight: "700" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border ?? "#2a3140",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
    marginBottom: 12,
    backgroundColor: colors.card ?? "#12161c",
  },
  errorHint: {
    fontSize: 13,
    color: "#f87171",
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
  buttonTextDisabled: { color: colors.bg },
  secondary: { marginTop: 14, alignItems: "center", padding: 10 },
  secondaryText: { color: colors.muted, fontSize: 14 },
  hint: { fontSize: 13, color: colors.dim, marginBottom: 20, lineHeight: 18 },
  legal: { marginTop: 28, fontSize: 12, color: colors.dim, textAlign: "center", lineHeight: 18 },
  link: { color: colors.accent },
});
