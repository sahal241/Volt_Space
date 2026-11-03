'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Send, Sparkles, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, PageHeading } from '@/components/ui/primitives';
import { useWorkspace } from '@/hooks/use-workspace';
import { api } from '@/lib/utils/api';
import { energyFacts, type EnergyFact } from '@/lib/intelligence/facts';
import { currency, number } from '@/lib/utils/format';
interface Answer {
  explanation: string;
  facts: EnergyFact[];
  action: string;
  source: string;
  question: string;
}
export function EnergyAssistant() {
  const w = useWorkspace(),
    [question, setQuestion] = useState(''),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [answers, setAnswers] = useState<Answer[]>([]);
  const facts = energyFacts(w, w.month),
    base = w.isDemo ? '/demo' : '';
  const ask = async () => {
    if (question.trim().length < 3) return;
    setBusy(true);
    setError('');
    const asked = question.trim();
    try {
      const response = w.isDemo
        ? {
            explanation:
              'Your household model connects recorded consumption with estimated appliance use. Review the unexplained portion before changing habits. Saved scenarios let you compare alternatives without changing your inventory.',
            facts: facts.slice(0, 6),
            action: 'twin',
            source: 'demo',
          }
        : await api<Omit<Answer, 'question'>>('/api/assistant', {
            method: 'POST',
            body: { question: asked, month: w.month, consent },
          });
      setAnswers((a) => [{ ...response, question: asked }, ...a].slice(0, 15));
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reach the assistant.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="GROUNDED IN YOUR ENERGY DATA"
        title="Ask VoltSpace"
        description="Ask about your bills, energy patterns and savings options. Gemini explains; the calculation engine supplies every displayed number."
      />
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <label>
            Your energy question
            <textarea
              required
              rows={3}
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should I focus on to understand my electricity use?"
            />
          </label>
          <div className="question-suggestions">
            {[
              'What explains my energy use?',
              'How is my next bill forecast calculated?',
              'Where could I save energy?',
            ].map((q) => (
              <button
                type="button"
                key={q}
                className="button subtle compact"
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
          {!w.isDemo && (
            <label className="checkbox-label phase2-spacing">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I agree to send my question and calculated energy summary to Google Gemini. Bill
              documents, account numbers, email and meter identifiers are excluded.
            </label>
          )}
          <div className="modal-actions">
            <span className="form-hint">
              {w.isDemo
                ? 'Demo answers are local examples. No API call is made.'
                : 'Questions stay in this browser session; they are not saved to your account.'}
            </span>
            <button
              className="button primary"
              disabled={busy || question.trim().length < 3 || (!w.isDemo && !consent)}
            >
              <Send size={16} />
              {busy ? 'Preparing a verified answer…' : 'Ask VoltSpace'}
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="form-error">
            {error} Your calculated facts remain available below.
          </p>
        )}
      </Card>
      <div aria-live="polite" aria-busy={busy}>
        {answers.map((a, i) => (
          <Card className="phase2-spacing assistant-answer" key={`${a.question}-${i}`}>
            <span className="eyebrow">YOU ASKED</span>
            <h2>{a.question}</h2>
            <p>
              <Sparkles size={17} className="accent" /> {a.explanation}
            </p>
            <span className="badge">
              {a.source === 'gemini'
                ? 'Gemini explanation · validated facts'
                : a.source === 'demo'
                  ? 'Illustrative demo answer'
                  : 'Calculated fallback · no AI explanation'}
            </span>
            <FactList facts={a.facts} />
            <Link className="text-link" href={`${base}/${a.action}`}>
              Explore {a.action}
              <ArrowUpRight size={15} />
            </Link>
          </Card>
        ))}
      </div>
      <Card className="phase2-spacing">
        <CardHeader
          title="Your calculated context"
          subtitle={`Selected month: ${w.month}. Only this minimal summary is shared when you ask.`}
          action={<ShieldCheck size={20} />}
        />
        <FactList facts={facts} />
        <p className="form-hint">
          Forecasts require consecutive billing history. Unavailable facts are omitted. Tariff costs
          are estimates, and emissions use your configured factor. Model output containing numerical
          claims or unknown fact references is rejected.
        </p>
      </Card>
    </>
  );
}
function FactList({ facts }: { facts: EnergyFact[] }) {
  return (
    <dl className="detail-list">
      {facts.map((f) => (
        <div key={f.id}>
          <dt>
            {f.label}
            <small className="block muted">{f.kind}</small>
          </dt>
          <dd>{f.unit === 'INR' ? currency(f.value) : `${number(f.value)} ${f.unit}`}</dd>
        </div>
      ))}
    </dl>
  );
}
