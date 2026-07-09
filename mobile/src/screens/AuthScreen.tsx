import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { LEGAL } from "../config";
import { login, persistSession, register, verify2fa } from "../lib/api";
import { colors } from "../theme";

export function AuthScreen() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [acceptLegal, setAcceptLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (pendingToken) {
        const session = await verify2fa(pendingToken, code);
        const user = await persistSession(session);
        if (user) setUser(user);
        return;
      }

      if (mode === "register") {
        if (!acceptLegal) {
          setError("Accept Privacy Policy and Terms to continue.");
          return;
        }
        const session = await register(email, password, true, true);
        const user = await persistSession(session);
        if (user) setUser(user);
        return;
      }

      const session = await login(email, password);
      if (session.requires2fa && session.pendingToken) {
        setPendingToken(session.pendingToken);
        return;
      }
      const user = await persistSession(session);
      if (user) setUser(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MotiveFX.AI</Text>
      <Text style={styles.sub}>
        {pendingToken ? "Enter your 2FA code" : mode === "login" ? "Sign in to your account" : "Create your account"}
      </Text>

      {!pendingToken && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 chars)"
            placeholderTextColor={colors.dim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </>
      )}

      {pendingToken && (
        <TextInput
          style={styles.input}
          placeholder="6-digit code"
          placeholderTextColor={colors.dim}
          keyboardType="number-pad"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        />
      )}

      {mode === "register" && !pendingToken && (
        <Pressable style={styles.legalRow} onPress={() => setAcceptLegal((v) => !v)}>
          <Text style={styles.legalCheck}>{acceptLegal ? "☑" : "☐"}</Text>
          <Text style={styles.legalText}>
            I agree to the{" "}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.privacy)}>
              Privacy Policy
            </Text>{" "}
            and{" "}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)}>
              Terms
            </Text>
          </Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>{pendingToken ? "Verify" : mode === "login" ? "Sign in" : "Create account"}</Text>
        )}
      </Pressable>

      {!pendingToken && (
        <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={styles.switch}>
            {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
          </Text>
        </Pressable>
      )}

      <Text style={styles.disclaimer}>
        Informational only. Not financial advice. Subscriptions at motivefxai.com.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 24 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: colors.bg, fontWeight: "700" },
  switch: { color: colors.accent, textAlign: "center", marginTop: 16 },
  error: { color: colors.red, marginBottom: 8 },
  legalRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "flex-start" },
  legalCheck: { color: colors.text, fontSize: 16 },
  legalText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.accent },
  disclaimer: { marginTop: 24, fontSize: 11, color: colors.dim, textAlign: "center", lineHeight: 16 },
});
