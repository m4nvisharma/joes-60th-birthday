import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { ArrowUpRight, Check, LoaderCircle, Sparkles, Trash2, X } from 'lucide-react';
import './styles.css';

const GOAL = 60;
const LOCAL_KEY = 'joes-60th-donations';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const seedDonations = [
  { id: 'seed-1', donor_name: 'Manya', created_at: '2026-09-26T12:00:00Z' },
  { id: 'seed-2', donor_name: 'Sarah', created_at: '2026-09-26T15:30:00Z' },
  { id: 'seed-3', donor_name: 'Rahul', created_at: '2026-09-27T08:15:00Z' },
  { id: 'seed-4', donor_name: 'Priya', created_at: '2026-09-27T09:40:00Z' }
];

function readLocalDonations() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return Array.isArray(stored) ? stored : seedDonations;
  } catch {
    return seedDonations;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function App() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [removalPassword, setRemovalPassword] = useState('');
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [previousCount, setPreviousCount] = useState(null);

  const count = donations.length;
  const progress = Math.min(count / GOAL, 1);
  const goalReached = count >= GOAL;
  const sortedDonations = useMemo(
    () => [...donations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [donations]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        if (active) {
          setDonations(readLocalDonations());
          setLoading(false);
        }
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('donations')
        .select('id, donor_name, created_at')
        .order('created_at', { ascending: false });
      if (active) {
        if (fetchError) setError('We could not load the shared list. Please refresh and try again.');
        setDonations(data || []);
        setLoading(false);
      }
    }
    load();
    if (!supabase) return () => { active = false; };
    const channel = supabase.channel('donations-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, payload => {
        setDonations(current => current.some(item => item.id === payload.new.id) ? current : [...current, payload.new]);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (previousCount !== null && previousCount < GOAL && count >= GOAL) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 6000);
    }
    setPreviousCount(count);
  }, [count, previousCount]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  function beginDonation() {
    setError('');
    setName('');
    setStep('name');
    setModalOpen(true);
  }

  function beginRemoval(donation) {
    setSelectedDonation(donation);
    setRemovalPassword('');
    setRemoveError('');
    setModalOpen(true);
    setStep('remove');
  }

  async function removeDonation() {
    if (removeSubmitting || !selectedDonation || !supabase) return;
    setRemoveSubmitting(true);
    setRemoveError('');
    const { error: removalError } = await supabase.rpc('remove_donation', {
      p_donation_id: selectedDonation.id,
      p_password: removalPassword
    });
    if (removalError) {
      setRemoveError('That password did not work, or this donation has already been removed.');
    } else {
      setDonations(current => current.filter(item => item.id !== selectedDonation.id));
      setModalOpen(false);
    }
    setRemoveSubmitting(false);
  }

  async function submitDonation() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const donor = name.trim() || 'Anonymous';
    const donation = { id: `local-${crypto.randomUUID()}`, donor_name: donor, created_at: new Date().toISOString() };
    try {
      if (supabase) {
        const { data, error: insertError } = await supabase
          .from('donations')
          .insert({ donor_name: donor })
          .select('id, donor_name, created_at')
          .single();
        if (insertError) throw insertError;
        setDonations(current => current.some(item => item.id === data.id) ? current : [...current, data]);
      } else {
        const next = [...readLocalDonations(), donation];
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setDonations(next);
      }
      setModalOpen(false);
    } catch {
      setError('That did not go through. Your donation was not recorded, please try again.');
      setStep('confirm');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Joe's 60th home"><span>J</span><span>60</span></a>
        <div className="topbar-right"><span className="live-dot" /> <span>Joe’s 60th birthday wish</span></div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow">A campaign of life &amp; love</p>
            <h1>A birthday<br /><em>worth</em><br /><strong>bleeding</strong><br />for.</h1>
            <p className="hero-intro">For Joe’s 60th, we’re turning one birthday wish into something that can keep giving: <strong>60 pints of blood.</strong></p>
            <button className="primary-button" onClick={beginDonation}>Donate now <ArrowUpRight size={18} /></button>
          </div>
          <div className="hero-art" aria-label={`${count} pints donated out of 60`}>
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="bag-wrap">
              <div className="bag-hook" />
              <div className="blood-bag">
                <div className="bag-label"><span>JOE / 60</span><small>WHOLE BLOOD<br />A POSITIVE</small></div>
                <div className="bag-liquid" style={{ height: `${Math.max(progress * 78, 3)}%` }}><div className="liquid-shine" /></div>
                <div className="bag-scale"><span>60</span><span>45</span><span>30</span><span>15</span><span>0</span></div>
              </div>
              <div className="bag-tube"><i /><b /></div>
            </div>
            <div className="hero-count"><span>{count}</span><small>pints donated</small></div>
            <div className="goal-stamp">{goalReached ? <><span>60+</span><small>goal reached</small></> : <><span>{GOAL - count}</span><small>pints to go</small></>}</div>
          </div>
        </section>

        <section className="progress-band">
          <div className="section-wrap progress-content">
            <div><p className="eyebrow">The measure of a life</p><h2>{goalReached ? 'The goal is reached.' : 'Every pint counts.'}</h2></div>
            <div className="progress-meter" aria-label={`${count} of ${GOAL} pints donated`}><div className="meter-track"><div className="meter-fill" style={{ width: `${progress * 100}%` }} /></div><div className="meter-labels"><span>0</span><span>{GOAL} pints</span></div></div>
            <p className="progress-note">{goalReached ? 'And we’re not stopping here. Keep the giving going.' : <>Help us fill the bag before the candles go out. <strong>{GOAL - count} pints</strong> still to find.</>}</p>
          </div>
        </section>

        <section className="story section-wrap">
          <div className="story-photo"><img src={`${import.meta.env.BASE_URL}images/joe-standing.jpeg`} alt="Joe smiling outdoors" /><span className="photo-note">60 years<br />of showing up</span></div>
          <div className="story-copy"><p className="eyebrow">A birthday wish, reimagined</p><h2>In honour of Joe’s 60th birthday, we’re turning <em>60 years</em> into 60 pints of giving.</h2><p>As the years go by, Joe is reminded of just how delicate and precious life is — especially as many of his loved ones have endured hardships where blood donations have made a significant impact in their way to recovery.</p><div className="story-more"><p>Let’s honour those whose selflessness and generosity has aided our loved ones in times of need. For Joe’s birthday wish, he would like to celebrate by giving back.</p><p>Please make his wish come true and donate blood this year. It’s a small gesture that can have an incredible impact — and a meaningful way to celebrate 60 years of life, love, and the people who make it special.</p></div></div>
        </section>

        <section className="donor-section section-wrap" id="donors">
          <div className="donor-heading"><div><p className="eyebrow">The giving circle</p><h2>Recent donors</h2></div></div>
          <div className="donor-grid"><div className="donor-image"><img src={`${import.meta.env.BASE_URL}images/joe-selfie.jpeg`} alt="Joe taking a selfie" /><div className="image-caption">One small act.<br /><strong>A lasting impact.</strong></div></div><div className="donor-list" aria-live="polite">{loading ? <div className="empty-state"><LoaderCircle className="spin" /> Loading the giving circle…</div> : sortedDonations.length === 0 ? <div className="empty-state">Be the first name on the list.</div> : sortedDonations.map((donor, index) => <div className="donor-row" key={donor.id}><span className="donor-index">{String(sortedDonations.length - index).padStart(2, '0')}</span><strong>{donor.donor_name}</strong><time>{formatDate(donor.created_at)}</time><Check size={17} /><button className="remove-button" onClick={() => beginRemoval(donor)} aria-label={`Remove donation from ${donor.donor_name}`}><Trash2 size={14} /></button></div>)}</div></div>
        </section>

        <section className="closing section-wrap"><div><p className="eyebrow">A little birthday math</p><h2>One pint can help save up to <em>three lives.</em></h2></div><div className="closing-cta"><p>Make Joe’s 60th birthday wish come true. Your name is optional. Your impact isn’t.</p></div></section>
      </main>

      <footer><div className="brand"><span>J</span><span>60</span></div><p>Made with love for Joe’s 60th.</p><span className="footer-note">A little more love, one pint at a time ♡</span></footer>
      {celebrate && <div className="celebration" role="status"><Sparkles size={22} /><strong>We made it!</strong><span>60 pints donated, and counting.</span><button onClick={() => setCelebrate(false)} aria-label="Dismiss celebration"><X size={18} /></button></div>}
      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setModalOpen(false)}><div className="donation-modal" role="dialog" aria-modal="true" aria-labelledby="donation-title"><button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close"><X /></button>{step === 'remove' ? <><div className="confirm-mark"><Trash2 size={32} /></div><p className="eyebrow">Protected action</p><h2 id="donation-title">Remove this donation?</h2><p className="modal-lede">Enter the campaign admin password to remove <strong>{selectedDonation?.donor_name}</strong> from the shared list. This cannot be undone.</p><label htmlFor="removal-password">Admin password</label><input id="removal-password" type="password" autoFocus value={removalPassword} onChange={event => setRemovalPassword(event.target.value)} onKeyDown={event => event.key === 'Enter' && removeDonation()} />{removeError && <p className="form-error" role="alert">{removeError}</p>}<div className="confirm-actions"><button className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-button" disabled={removeSubmitting || !removalPassword} onClick={removeDonation}>{removeSubmitting ? <><LoaderCircle className="spin" size={18} /> Removing…</> : <>Remove pint <Trash2 size={17} /></>}</button></div></> : step === 'name' ? <><p className="eyebrow">Join the giving circle</p><h2 id="donation-title">Who’s donating today?</h2><p className="modal-lede">Your name is optional. We’ll add it to the shared list so everyone can feel the momentum.</p><label htmlFor="donor-name">Your name <span>(optional)</span></label><input id="donor-name" autoFocus value={name} onChange={event => setName(event.target.value.slice(0, 80))} placeholder="e.g. Sarah" onKeyDown={event => event.key === 'Enter' && setStep('confirm')} /><label className="anonymous-check"><input type="checkbox" checked={!name} onChange={event => event.target.checked && setName('')} /><span>Donate anonymously</span></label><button className="primary-button modal-button" onClick={() => setStep('confirm')}>Continue <ArrowUpRight size={18} /></button></> : <><div className="confirm-mark">🩸</div><p className="eyebrow">Just to confirm</p><h2 id="donation-title">Are you sure you donated a pint of blood?</h2><p className="modal-lede">You’re recording this as <strong>{name.trim() || 'Anonymous'}</strong>. This can’t be edited or removed later.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="confirm-actions"><button className="secondary-button" onClick={() => setStep('name')}>Go back</button><button className="primary-button" disabled={submitting} onClick={submitDonation}>{submitting ? <><LoaderCircle className="spin" size={18} /> Saving…</> : <>Yes, record my pint <Check size={18} /></>}</button></div></>}</div></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
