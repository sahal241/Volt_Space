'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import type { Appliance, Bill, UserSettings, Simulation, Profile, WorkspaceData } from '@/types';
import { demoAppliances, demoBills } from '@/lib/demo';
import { defaultTariff, calculateTariff } from '@/lib/calculations/tariff';
import { Decimal, round } from '@/lib/calculations/precision';
import { monthlyEnergy } from '@/lib/calculations/energy';
import {
  defaultPreferences,
  type EnergyPreferences,
  type SavingsPlan,
  type ScenarioInput,
} from '@/lib/intelligence/types';
import { evaluateScenario } from '@/lib/intelligence/engine';
import { generateInsights } from '@/lib/insights/rules';
import { api } from '@/lib/utils/api';
import type { BillInput } from '@/lib/validation/bills';
import type { z } from 'zod';
import type { applianceSchema } from '@/lib/validation/schemas';
import type { workspaceSettingsSchema } from '@/lib/validation/tariff';
type Theme = 'dark' | 'light' | 'system';
type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: 'system',
  setTheme: () => {},
});
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});
export function Providers({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>('dark');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const setTheme = useCallback((value: Theme) => {
    updateTheme(value);
    try {
      localStorage.setItem('voltscope-theme', value);
    } catch {
      /* Theme still works when browser storage is blocked. */
    }
  }, []);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('voltscope-theme');
    } catch {
      /* Storage can be unavailable in private browser contexts. */
    }
    // Synchronize the saved browser preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'dark' || stored === 'light' || stored === 'system') updateTheme(stored);
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    timers.current.push(
      setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 6500),
    );
  }, []);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ToastContext.Provider value={toast}>
        {children}
        <div className="toast-region" aria-live="polite" aria-relevant="additions text">
          {toasts.map((item) => (
            <div className={`toast ${item.tone}`} key={item.id}>
              {item.tone === 'error' ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
              <span>{item.message}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setToasts((current) => current.filter((t) => t.id !== item.id))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </ThemeContext.Provider>
  );
}
type ApplianceInput = z.infer<typeof applianceSchema>;
type SettingsInput = z.infer<typeof workspaceSettingsSchema>;
interface WorkspaceState {
  preferences: EnergyPreferences;
  plans: SavingsPlan[];
  savePreferences: (values: EnergyPreferences) => Promise<void>;
  saveHouseholdScenario: (values: ScenarioInput, id?: string) => Promise<void>;
  updateSimulation: (id: string, name: string) => Promise<void>;
  removeSimulation: (id: string) => Promise<void>;
  addPlan: (ruleId: string) => Promise<void>;
  updatePlan: (id: string, status: SavingsPlan['status']) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  appliances: Appliance[];
  bills: Bill[];
  settings: UserSettings;
  tariffs: WorkspaceData['tariffs'];
  simulations: Simulation[];
  profile: Profile | null;
  month: string;
  setMonth: (month: string) => void;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveAppliance: (values: ApplianceInput, id?: string) => Promise<void>;
  removeAppliance: (id: string) => Promise<void>;
  saveBill: (
    id: string,
    values: BillInput,
    path: string | null,
    editing?: boolean,
  ) => Promise<void>;
  removeBill: (id: string) => Promise<string | undefined>;
  saveSettings: (values: SettingsInput) => Promise<void>;
  saveSimulation: (values: {
    name: string;
    power: number;
    currentHours: number;
    modifiedHours: number;
  }) => Promise<void>;
}
const WorkspaceContext = createContext<WorkspaceState | null>(null);
const seedSettings: UserSettings = {
  fullName: 'Alex Morgan',
  currency: 'INR',
  rate: 6.2,
  fixedCharge: 100,
  billingDays: 30,
  tariff: { ...defaultTariff, rate_per_kwh: 6.2, fixed_charge: 100 },
};
export function WorkspaceProvider({ children, isDemo }: { children: ReactNode; isDemo: boolean }) {
  const [appliances, setAppliances] = useState<Appliance[]>(isDemo ? demoAppliances : []),
    [bills, setBills] = useState<Bill[]>(isDemo ? demoBills : []);
  const [settings, setSettings] = useState<UserSettings>(
    isDemo
      ? seedSettings
      : { ...seedSettings, fullName: '', rate: 7, fixedCharge: 0, tariff: defaultTariff },
  );
  const [tariffs, setTariffs] = useState<WorkspaceData['tariffs']>([]),
    [simulations, setSimulations] = useState<Simulation[]>([]),
    [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<EnergyPreferences>(
    isDemo
      ? { ...defaultPreferences, target_kwh: 260, target_bill: 2000, onboarding_completed: true }
      : defaultPreferences,
  );
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [month, setMonth] = useState(isDemo ? '2026-11' : new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(!isDemo),
    [error, setError] = useState<string | null>(null);
  const apply = useCallback((data: WorkspaceData) => {
    setAppliances(data.appliances);
    setBills(data.bills);
    setSettings(data.settings);
    setTariffs(data.tariffs);
    setSimulations(data.simulations);
    setProfile(data.profile);
    setPreferences(data.preferences);
    setPlans(data.plans);
  }, []);
  const refresh = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    setError(null);
    try {
      apply(await api<WorkspaceData>('/api/workspace'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your workspace.');
    } finally {
      setLoading(false);
    }
  }, [isDemo, apply]);
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const controller = new AbortController();
    api<WorkspaceData>('/api/workspace', { signal: controller.signal })
      .then((data) => {
        if (active) {
          apply(data);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load your workspace.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [isDemo, apply]);
  async function saveAppliance(values: ApplianceInput, id?: string) {
    const now = new Date().toISOString();
    const record = isDemo
      ? {
          ...values,
          id: id ?? crypto.randomUUID(),
          user_id: 'demo',
          created_at: now,
          updated_at: now,
        }
      : await api<Appliance>(id ? `/api/appliances/${id}` : '/api/appliances', {
          method: id ? 'PUT' : 'POST',
          body: values,
        });
    setAppliances((current) =>
      id ? current.map((item) => (item.id === id ? record : item)) : [...current, record],
    );
  }
  async function removeAppliance(id: string) {
    const previous = appliances.find((a) => a.id === id);
    setAppliances((current) => current.filter((a) => a.id !== id));
    try {
      if (!isDemo) await api(`/api/appliances/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (previous) setAppliances((current) => [...current, previous]);
      throw err;
    }
  }
  async function saveBill(id: string, values: BillInput, path: string | null, editing = false) {
    const record = isDemo
      ? { ...values, id, user_id: 'demo', file_url: path, created_at: new Date().toISOString() }
      : await api<Bill>(editing ? `/api/bills/${id}` : '/api/bills', {
          method: editing ? 'PUT' : 'POST',
          body: editing ? values : { id, values, file_path: path },
        });
    setBills((current) =>
      editing
        ? current.map((b) => (b.id === id ? record : b))
        : [record, ...current.filter((b) => b.id !== id)],
    );
    setMonth(values.billing_month.slice(0, 7));
  }
  async function removeBill(id: string) {
    const previous = bills.find((b) => b.id === id);
    setBills((current) => current.filter((b) => b.id !== id));
    try {
      if (!isDemo) {
        const response = await api<{ warning?: string }>(`/api/bills/${id}`, { method: 'DELETE' });
        return response.warning;
      }
    } catch (err) {
      if (previous)
        setBills((current) =>
          [...current, previous].sort((a, b) => b.billing_month.localeCompare(a.billing_month)),
        );
      throw err;
    }
  }
  async function saveSettings(values: SettingsInput) {
    if (isDemo) {
      setSettings({
        ...values,
        rate: values.tariff.rate_per_kwh,
        fixedCharge: values.tariff.fixed_charge,
      });
      return;
    }
    apply(await api<WorkspaceData>('/api/settings', { method: 'PUT', body: values }));
  }
  async function saveSimulation(values: {
    name: string;
    power: number;
    currentHours: number;
    modifiedHours: number;
  }) {
    const base = { power_watts: values.power, days_per_month: settings.billingDays, quantity: 1 };
    const original = monthlyEnergy({ ...base, hours_per_day: values.currentHours }),
      modified = monthlyEnergy({ ...base, hours_per_day: values.modifiedHours });
    const record = isDemo
      ? {
          id: crypto.randomUUID(),
          user_id: 'demo',
          name: values.name,
          original_kwh: original,
          simulated_kwh: modified,
          estimated_savings: round(
            new Decimal(calculateTariff(original, settings.tariff).total).minus(
              calculateTariff(modified, settings.tariff).total,
            ),
          ),
          created_at: new Date().toISOString(),
        }
      : await api<Simulation>('/api/simulations', { method: 'POST', body: values });
    setSimulations((current) => [record, ...current]);
  }
  async function savePreferences(values: EnergyPreferences) {
    const record = isDemo
      ? values
      : await api<EnergyPreferences>('/api/preferences', { method: 'PUT', body: values });
    setPreferences(record);
  }
  async function saveHouseholdScenario(values: ScenarioInput, id?: string) {
    const previous = simulations.find((s) => s.id === id);
    const record = isDemo
      ? {
          id: id ?? crypto.randomUUID(),
          user_id: 'demo',
          name: values.name,
          created_at: previous?.created_at ?? new Date().toISOString(),
          ...evaluateScenario(bills, appliances, settings.tariff, values, settings.billingDays),
        }
      : await api<Simulation>(id ? `/api/simulations/${id}` : '/api/simulations', {
          method: id ? 'PUT' : 'POST',
          body: values,
        });
    setSimulations((current) => [record, ...current.filter((s) => s.id !== record.id)]);
  }
  async function updateSimulation(id: string, name: string) {
    if (!isDemo) await api(`/api/simulations/${id}`, { method: 'PUT', body: { name } });
    setSimulations((current) => current.map((item) => (item.id === id ? { ...item, name } : item)));
  }
  async function removeSimulation(id: string) {
    if (!isDemo) await api(`/api/simulations/${id}`, { method: 'DELETE' });
    setSimulations((current) => current.filter((item) => item.id !== id));
  }
  async function addPlan(ruleId: string) {
    const insight = generateInsights(
      bills,
      appliances,
      settings.tariff,
      month,
      settings.billingDays,
    ).find((i) => i.id === ruleId);
    if (!insight) throw new Error('Recommendation is no longer available.');
    const record = isDemo
      ? {
          id: crypto.randomUUID(),
          user_id: 'demo',
          rule_id: ruleId,
          title: insight.title,
          status: 'planned' as const,
          created_at: new Date().toISOString(),
        }
      : await api<SavingsPlan>('/api/plans', { method: 'POST', body: { rule_id: ruleId, month } });
    setPlans((current) => [record, ...current.filter((p) => p.rule_id !== ruleId)]);
  }
  async function updatePlan(id: string, status: SavingsPlan['status']) {
    const previous = plans.find((p) => p.id === id);
    setPlans((current) => current.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      if (!isDemo) await api(`/api/plans/${id}`, { method: 'PUT', body: { status } });
    } catch (error) {
      if (previous) setPlans((current) => current.map((p) => (p.id === id ? previous : p)));
      throw error;
    }
  }
  async function removePlan(id: string) {
    if (!isDemo) await api(`/api/plans/${id}`, { method: 'DELETE' });
    setPlans((current) => current.filter((p) => p.id !== id));
  }
  return (
    <WorkspaceContext.Provider
      value={{
        preferences,
        plans,
        savePreferences,
        saveHouseholdScenario,
        updateSimulation,
        removeSimulation,
        addPlan,
        updatePlan,
        removePlan,
        appliances,
        bills,
        settings,
        tariffs,
        simulations,
        profile,
        month,
        setMonth,
        isDemo,
        loading,
        error,
        refresh,
        saveAppliance,
        removeAppliance,
        saveBill,
        removeBill,
        saveSettings,
        saveSimulation,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export const useToast = () => useContext(ToastContext);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider is required.');
  return value;
}
