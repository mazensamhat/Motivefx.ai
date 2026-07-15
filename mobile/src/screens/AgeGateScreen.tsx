import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { LEGAL } from "../config";
import { colors } from "../theme";

interface Props {
  onAccepted: () => void;
}

/**
 * Lightweight 18+ age assurance shown once on first launch.
 * Justifies Age Rating "In-App Controls" / age assurance for sports-betting modules.
 */
export function AgeGateScreen({ onAccepted }: Props) {
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access restricted</Text>
        <Text style={styles.body}>
          MotiveFX.AI includes sports-betting and event-market intelligence modules. You must be 18
          or older to use this app.
        </Text>
        <Text style={styles.hint}>Close the app or confirm you are 18+ to continue.</Text>
        <Pressable style={styles.button} onPress={() => setDeclined(false)}>
          <Text style={styles.buttonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>MotiveFX.AI</Text>
      <Text style={styles.title}>Age verification</Text>
      <Text style={styles.body}>
        This app includes gambling-adjacent sports betting and prediction-market intelligence.
        Confirm you are at least <Text style={styles.strong}>18 years old</Text> and that this
        content is legal where you live.
      </Text>
      <Pressable style={styles.button} onPress={onAccepted}>
        <Text style={styles.buttonText}>I am 18 or older</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => setDeclined(true)}>
        <Text style={styles.secondaryText}>I am under 18</Text>
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
    marginBottom: 28,
  },
  strong: { color: colors.text, fontWeight: "700" },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
  secondary: { marginTop: 14, alignItems: "center", padding: 10 },
  secondaryText: { color: colors.muted, fontSize: 14 },
  hint: { fontSize: 13, color: colors.dim, marginBottom: 20, lineHeight: 18 },
  legal: { marginTop: 28, fontSize: 12, color: colors.dim, textAlign: "center", lineHeight: 18 },
  link: { color: colors.accent },
});
