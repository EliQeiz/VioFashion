// src/hooks/useAuth.jsx - Firebase Auth
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseClient";

const AuthContext = createContext({});

function normalizeProfile(data) {
  if (!data) return null;

  return {
    ...data,
    profile_services: (data.services || []).map((service) => ({ service })),
  };
}

async function fetchProfile(uid) {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? normalizeProfile({ id: snap.id, ...snap.data() }) : null;
}

async function ensureProfile(firebaseUser, overrides = {}) {
  const existing = await fetchProfile(firebaseUser.uid);
  if (existing) return existing;

  const profileData = createBaseProfile(firebaseUser, overrides);
  await setDoc(doc(db, "profiles", firebaseUser.uid), profileData);
  return normalizeProfile(profileData);
}

function createBaseProfile(user, overrides = {}) {
  const email = overrides.email || user.email || "";

  return {
    id: user.uid,
    email,
    username: overrides.username || email.split("@")[0] || "",
    full_name: overrides.fullName || user.displayName || "",
    role: overrides.role || "customer",
    bio: null,
    location: null,
    avatar_url: user.photoURL || null,
    banner_url: null,
    followers_count: 0,
    following_count: 0,
    orders_count: 0,
    rating: null,
    is_verified: false,
    services: [],
    created_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const refreshProfile = useCallback(
    async (uid) => {
      const id = uid || user?.uid;
      if (!id) return null;

      try {
        const data = await fetchProfile(id);
        setProfile(data);
        setAuthError(null);
        return data;
      } catch (error) {
        console.error("Failed to refresh profile", error);
        setAuthError(error);
        return null;
      }
    },
    [user?.uid],
  );

  useEffect(() => {
    const loadingTimeout = window.setTimeout(() => {
      console.warn("Firebase auth initialization timed out.");
      setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      window.clearTimeout(loadingTimeout);
      setLoading(false);

      if (!firebaseUser) {
        setProfile(null);
        setAuthError(null);
        return;
      }

      fetchProfile(firebaseUser.uid)
        .then((data) => {
          if (data) {
            setProfile(data);
            return data;
          }

          return ensureProfile(firebaseUser).then((createdProfile) => {
            setProfile(createdProfile);
            return createdProfile;
          });
        })
        .then(() => {
          setAuthError(null);
        })
        .catch((profileError) => {
          console.error("Failed to load profile", profileError);
          setProfile(null);
          setAuthError(profileError);
        });
    }, (error) => {
      console.error("Firebase auth state failed", error);
      setAuthError(error);
      window.clearTimeout(loadingTimeout);
      setLoading(false);
    });

    return () => {
      window.clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        const data = await ensureProfile(result.user);
        setUser(result.user);
        setProfile(data);
      })
      .catch((error) => {
        console.error("Google redirect sign-in failed", error);
        setAuthError(error);
      });
  }, []);

  const signIn = async ({ email, password }) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async ({ email, password, username, fullName, role }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profileData = createBaseProfile(credential.user, {
      email,
      username,
      fullName,
      role,
    });

    await setDoc(doc(db, "profiles", credential.user.uid), profileData);
    setUser(credential.user);
    setProfile(normalizeProfile(profileData));

    return credential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const credential = await signInWithPopup(auth, provider);
      const data = await ensureProfile(credential.user);
      setUser(credential.user);
      setProfile(data);
      return credential;
    } catch (error) {
      const redirectableCodes = new Set([
        "auth/popup-blocked",
        "auth/popup-closed-by-user",
        "auth/cancelled-popup-request",
      ]);

      if (redirectableCodes.has(error?.code)) {
        await signInWithRedirect(auth, provider);
        return null;
      }

      throw error;
    }
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email, {
      url: window.location.origin,
      handleCodeInApp: false,
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
