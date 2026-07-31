import { useRef, useState } from "react";
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
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { API_BASE, LEGAL } from "../config";
import { login, mapNetworkError, persistSession, register, verify2fa } from "../lib/api";
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
  const submittingRef = useRef(false);

  async function completeLogin(session: Awaited<ReturnType<typeof login>>) {
    const user = await persistSession(session);
    if (!user) {
      throw new Error("Login succeeded but session could not be saved. Try again.");
    }
    setUser(user);
  }

  async function handleSubmit() {
    if (submittingRef.current || loading) return;
    setError(null);

    const trimmedEmail = email.trim();
    if (!pendingToken) {
      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        setError("Enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    } else if (code.length < 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    if (mode === "register" && !pendingToken && !acceptLegal) {
      setError("Accept Privacy Policy and Terms to continue.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      if (pendingToken) {
        const session = await verify2fa(pendingToken, code);
        await completeLogin(session);
        return;
      }

      if (mode === "register") {
        const session = await register(trimmedEmail, password, true, true);
        await completeLogin(session);
        return;
      }

      const session = await login(trimmedEmail, password);
      if (session.requires2fa && session.pendingToken) {
        setPendingToken(session.pendingToken);
        return;
      }
      await completeLogin(session);
    } catch (e) {
      console.warn("Auth submit failed", e, { apiBase: API_BASE });
      setError(mapNetworkError(e).message);
    } finally {
      submittingRef.current = false;
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
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>MotiveFX.AI</Text>
        <Text style={styles.sub}>
          {pendingToken
            ? "Enter your 2FA code"
            : mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
        </Text>

        {!pendingToken && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              importantForAutofill="yes"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 8 chars)"
              placeholderTextColor={colors.dim}
              secureTextEntry
              textContentType="password"
              autoComplete={mode === "login" ? "password" : "new-password"}
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={() => void handleSubmit()}
            />
          </>
        )}

        {pendingToken && (
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            placeholderTextColor={colors.dim}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
          />
        )}

        {mode === "register" && !pendingToken && (
          <Pressable
            style={styles.legalRow}
            onPress={() => setAcceptLegal((v) => !v)}
            disabled={loading}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptLegal }}
          >
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

        {error && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.errorHint}>Tap Sign in again after checking your connection.</Text>
          </View>
        )}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
          accessibilityLabel={pendingToken ? "Verify code" : mode === "login" ? "Sign in" : "Create account"}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>
              {pendingToken ? "Verify" : mode === "login" ? "Sign in" : "Create account"}
            </Text>
          )}
        </Pressable>

        {!pendingToken && (
          <Pressable
            onPress={() => {
              if (loading) return;
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.switch}>
              {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
            </Text>
          </Pressable>
        )}

        {pendingToken && (
          <Pressable
            onPress={() => {
              if (loading) return;
              setPendingToken(null);
              setCode("");
              setError(null);
            }}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.switch}>Back to sign in</Text>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>
          Informational only. Not financial advice. This app is an account companion — subscriptions are
          managed on the web at motivefxai.com/pricing (opens in Safari). Digital content is not sold
          inside this app.
        </Text>
        <Text style={styles.buildTag}>Build 1.0.3</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
  title: { fontSize: 30, fontWeight: "700", color: colors.text, marginBottom: 10 },
  sub: { fontSize: 16, color: colors.muted, marginBottom: 24, lineHeight: 22 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 52,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    minHeight: 52,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
  switch: { color: colors.accent, textAlign: "center", marginTop: 16, fontSize: 15, paddingVertical: 8 },
  errorBox: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  error: { color: colors.red, fontSize: 15, fontWeight: "600" },
  errorHint: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  legalRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "flex-start", minHeight: 44 },
  legalCheck: { color: colors.text, fontSize: 18 },
  legalText: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
  link: { color: colors.accent },
  disclaimer: { marginTop: 24, fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
  buildTag: {
    marginTop: 10,
    fontSize: 12,
    color: colors.dim,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
