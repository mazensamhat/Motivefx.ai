import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  async function completeLogin(session: Awaited<ReturnType<typeof login>>) {
    const user = await persistSession(session);
    if (!user) {
      throw new Error("Login succeeded but session could not be saved. Try again.");
    }
    setUser(user);
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (pendingToken) {
        const session = await verify2fa(pendingToken, code);
        await completeLogin(session);
        return;
      }

      if (mode === "register") {
        if (!acceptLegal) {
          setError("Accept Privacy Policy and Terms to continue.");
          return;
        }
        const session = await register(email, password, true, true);
        await completeLogin(session);
        return;
      }

      const session = await login(email, password);
      if (session.requires2fa && session.pendingToken) {
        setPendingToken(session.pendingToken);
        return;
      }
      await completeLogin(session);
    } catch (e) {
      console.warn("Auth submit failed", e);
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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
            </Text>
            {", "}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)}>
              Terms
            </Text>
            {", and "}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.dataDeletion)}>
              Data deletion
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
        Informational only. Not financial advice. This app is an account companion — subscriptions are
        managed on the web at motivefxai.com/pricing (opens in Safari). Digital content is not sold
        inside this app.
      </Text>
      <Text style={styles.buildTag}>Build 1.0.1</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
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
  buildTag: { marginTop: 10, fontSize: 10, color: colors.dim, textAlign: "center", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
