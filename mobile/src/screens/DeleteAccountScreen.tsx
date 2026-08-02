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
import { API_BASE, LEGAL } from "../config";
import { useAuth } from "../context/AuthContext";
import {
  ApiError,
  fetchWithTimeout,
  login,
  mapNetworkError,
  persistSession,
} from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { colors } from "../theme";

interface Props {
  onCancel: () => void;
  /** Called after successful deletion (session already cleared). */
  onDeleted: () => void;
}

/**
 * In-app account deletion (Google Play requirement for apps with account creation).
 * Works signed-in (Bearer) or signed-out (sign-in then delete).
 */
export function DeleteAccountScreen({ onCancel, onDeleted }: Props) {
  const { user, logout, setUser } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function ensureAccessToken(): Promise<string> {
    const existing = await getAccessToken();
    if (existing) return existing;

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || password.length < 8) {
      throw new Error("Enter the account email and password to delete.");
    }
    const session = await login(trimmed, password);
    if (session.requires2fa) {
      throw new Error(
        "This account has 2FA enabled. Sign in first, then delete from Account."
      );
    }
    const saved = await persistSession(session);
    if (!saved || !session.accessToken) {
      throw new Error("Could not authenticate. Check email and password.");
    }
    setUser(saved);
    return session.accessToken;
  }

  async function handleDelete() {
    if (submittingRef.current || loading) return;
    setError(null);

    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE (all caps) to confirm.');
      return;
    }
    if (password.length < 1) {
      setError("Enter your password.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const token = await ensureAccessToken();
      const res = await fetchWithTimeout(
        `${API_BASE}/auth/delete-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password, confirmation: confirm }),
        },
        25_000
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new ApiError(body.error || body.detail || `Delete failed (${res.status})`, res.status);
      }
      try {
        await logout();
      } catch {
        setUser(null);
      }
      onDeleted();
    } catch (e) {
      console.warn("Delete account failed", e);
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
      >
        <Text style={styles.title}>Delete account</Text>
        <Text style={styles.body}>
          This permanently deletes your MotiveFX account and associated personal data we control.
          Most data is removed within 30 days. This cannot be undone.
        </Text>

        {!user && (
          <TextInput
            style={styles.input}
            placeholder="Account email"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        )}

        {user ? <Text style={styles.email}>{user.email}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.dim}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder='Type DELETE to confirm'
          placeholderTextColor={colors.dim}
          autoCapitalize="characters"
          value={confirm}
          onChangeText={setConfirm}
          editable={!loading}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.dangerButton, loading && styles.buttonDisabled]}
          onPress={() => void handleDelete()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Permanently delete account"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.dangerText}>Permanently delete account</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onCancel}
          disabled={loading}
          accessibilityRole="button"
          style={styles.cancelWrap}
        >
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>

        <Text style={styles.legal}>
          Policy:{" "}
          <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.dataDeletion)}>
            Data deletion
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 20 },
  email: { color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 12 },
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
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  error: { color: colors.red, fontSize: 15, fontWeight: "600" },
  dangerButton: {
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.65 },
  dangerText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelWrap: { marginTop: 16, paddingVertical: 10 },
  cancel: { color: colors.accent, textAlign: "center", fontSize: 15 },
  legal: { marginTop: 24, fontSize: 13, color: colors.muted, textAlign: "center" },
  link: { color: colors.accent },
});
