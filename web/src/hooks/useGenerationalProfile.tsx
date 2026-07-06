import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  COHORT_ORDER,
  profileForCohort,
  type CohortId,
  type GenerationalProfile,
} from "../config/generationalProfiles";
import { GenerationalSetupModal, type ProfileSetupData } from "../components/GenerationalSetupModal";
import { getAcquisitionChannel } from "../lib/acquisition";
import { persistAcquisitionOnLoad } from "../lib/trackVisit";
import { apiPost, getUserId } from "../lib/api";

const STORAGE_KEY = "motivefx_gen_cohort";
const PROFILE_DONE_KEY = "motivefx_profile_done";

interface GenerationalState {
  cohort: CohortId;
  profile: GenerationalProfile;
  setCohort: (id: CohortId) => void;
  openSetup: () => void;
  closeSetup: () => void;
  setupOpen: boolean;
}

const GenerationalContext = createContext<GenerationalState | null>(null);

function readStoredCohort(): CohortId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && COHORT_ORDER.includes(raw as CohortId)) return raw as CohortId;
  } catch {
    /* ignore */
  }
  return null;
}

function cohortAge(id: CohortId): number {
  if (id === "genz") return 24;
  if (id === "millennial") return 36;
  if (id === "genx") return 52;
  return 68;
}

export function GenerationalProvider({ children }: { children: ReactNode }) {
  const [cohort, setCohortState] = useState<CohortId>(() => readStoredCohort() ?? "millennial");
  const [setupOpen, setSetupOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const profile = useMemo(() => profileForCohort(cohort), [cohort]);

  const syncProfile = useCallback((data: Partial<ProfileSetupData> & { cohort: CohortId }) => {
    apiPost("/advisor/profile", {
      user_id: getUserId(),
      cohort: data.cohort,
      age: cohortAge(data.cohort),
      sex: data.sex,
      gender: data.gender,
      acquisition_channel: data.acquisitionChannel ?? getAcquisitionChannel(),
    }).catch(() => {});
  }, []);

  const setCohort = useCallback((id: CohortId) => {
    setCohortState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const completeSetup = useCallback(
    (data: ProfileSetupData) => {
      setCohort(data.cohort);
      syncProfile(data);
      try {
        localStorage.setItem(PROFILE_DONE_KEY, "1");
      } catch {
        /* ignore */
      }
    },
    [setCohort, syncProfile]
  );

  useEffect(() => {
    persistAcquisitionOnLoad(getUserId());
    document.documentElement.setAttribute("data-gen", cohort);
    return () => {
      document.documentElement.removeAttribute("data-gen");
    };
  }, [cohort]);

  useEffect(() => {
    const profileDone = localStorage.getItem(PROFILE_DONE_KEY);
    if (!readStoredCohort() || !profileDone) {
      setSetupOpen(true);
    }
    setInitialized(true);
  }, []);

  const openSetup = useCallback(() => setSetupOpen(true), []);
  const closeSetup = useCallback(() => setSetupOpen(false), []);

  return (
    <GenerationalContext.Provider
      value={{ cohort, profile, setCohort, openSetup, closeSetup, setupOpen }}
    >
      {children}
      {initialized && setupOpen && (
        <GenerationalSetupModal
          cohort={cohort}
          onComplete={(data) => {
            completeSetup(data);
            closeSetup();
          }}
          onDismiss={closeSetup}
        />
      )}
    </GenerationalContext.Provider>
  );
}

export function useGenerationalProfile() {
  const ctx = useContext(GenerationalContext);
  if (!ctx) throw new Error("useGenerationalProfile must be used within GenerationalProvider");
  return ctx;
}
