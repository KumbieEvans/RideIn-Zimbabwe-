import React, { useState, useEffect } from 'react';
import { User, VehicleType } from '../types';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES, ZIM_CITIES } from '../constants';
import { Button, Input } from './Shared';
import { xanoService } from '../services/xano';
import { compressImage } from '../services/utils';

export const LoginView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [role, setRole] = useState<'rider' | 'driver'>('rider');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [city, setCity] = useState('Harare');
  
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [religion, setReligion] = useState('');
  const [personality, setPersonality] = useState<'Talkative' | 'Quiet'>('Talkative');
  
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.PASSENGER);
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null]);

  const validatePassword = (pass: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pass);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) {
      if (forgotStep === 1) handleRequestReset();
      else handleCompleteReset();
      return;
    }
    if (isSignup && role === 'driver' && step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    setPhone(val);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const compressedDataUrl = await compressImage(file);
        setPhotos(prev => {
          const newPhotos = [...prev];
          newPhotos[index] = compressedDataUrl;
          return newPhotos;
        });
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
  };

  const handleRequestReset = async () => {
    if (!phone) { setError('Phone number required'); return; }
    setLoading(true);
    try {
      await xanoService.requestPasswordReset(`+263${phone}`);
      setForgotStep(2);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleCompleteReset = async () => {
    if (!resetCode || !password) { setError('Required fields missing'); return; }
    if (!validatePassword(password)) { setError('Security policy mismatch'); return; }
    setLoading(true);
    try {
      const user = await xanoService.completePasswordReset(`+263${phone}`, resetCode, password);
      if (user) onLogin(user);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!phone || !password) { setError('Credentials required'); setLoading(false); return; }
    try {
      const formattedPhone = `+263${phone}`;
      let user;
      if (isSignup) {
        if (!validatePassword(password)) { setError('Security policy mismatch'); setLoading(false); return; }
        user = await xanoService.signup({
          name: fullName,
          phone: formattedPhone,
          role,
          city,
          age: parseInt(age) || 0,
          gender, maritalStatus, religion, personality,
          vehicle: role === 'driver' ? { type: vehicleType, category: vehicleCategory, photos: photos.filter(p => p !== null) as string[] } : undefined
        }, password);
      } else {
        user = await xanoService.login(formattedPhone, password);
      }
      if (user) onLogin(user);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col p-8 safe-top font-sans overflow-y-auto no-scrollbar relative text-white">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      <div className="mb-16 animate-fade-in relative z-10 pt-12">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse"></div>
          <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.6em]">SECURE_TERMINAL_2.5</span>
        </div>
        <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">GRID <span className="text-brand-orange">ACCESS</span></h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full relative z-10 pb-16">
        <form onSubmit={handleNext} className="space-y-10">
          <div className="space-y-6">
            {isSignup && step === 1 && (
              <div className="flex bg-white/[0.03] p-1.5 rounded-3xl mb-10 border border-white/5">
                <button type="button" onClick={() => setRole('rider')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all ${role === 'rider' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-white/20'}`}>Passenger</button>
                <button type="button" onClick={() => setRole('driver')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all ${role === 'driver' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-white/20'}`}>Operator</button>
              </div>
            )}

            {isSignup && step === 1 && <Input variant="dark" label="Full_Name" icon="user" placeholder="COMMANDER NAME" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />}
            {(forgotStep === 1 || (!isForgot && step === 1)) && <Input variant="dark" label="Terminal_Phone" icon="phone" prefixText="+263" placeholder="77 000 0000" value={phone} onChange={handlePhoneChange} maxLength={9} inputMode="tel" required />}
            {isForgot && forgotStep === 2 && <Input variant="dark" label="Verification_Code" icon="key" placeholder="000000" value={resetCode} onChange={e => setResetCode(e.target.value)} maxLength={6} required />}
            {(!isForgot || forgotStep === 2) && step === 1 && <Input variant="dark" label="Access_Password" icon="lock" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />}
            
            {isSignup && step === 1 && (
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.3em] ml-1 block text-white/20 font-black">Operational_Sector</label>
                <select value={city} onChange={e => setCity(e.target.value)} className="w-full bg-white/[0.03] border-b-2 border-white/5 text-white rounded-t-3xl py-5 px-8 font-black text-base outline-none appearance-none transition-all focus:border-brand-orange/40">
                  {ZIM_CITIES.map(c => <option key={c} value={c} className="bg-[#000814]">{c}</option>)}
                </select>
              </div>
            )}

            {isSignup && role === 'driver' && step === 2 && (
              <div className="space-y-6">
                <Input variant="dark" label="Operator_Age" type="number" value={age} onChange={e => setAge(e.target.value)} required />
                <div className="grid grid-cols-2 gap-6">
                  <select value={gender} onChange={e => setGender(e.target.value)} className="bg-white/[0.03] border-b-2 border-white/5 text-white py-5 px-6 rounded-t-3xl font-black outline-none"><option className="bg-[#000814]">Male</option><option className="bg-[#000814]">Female</option></select>
                  <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="bg-white/[0.03] border-b-2 border-white/5 text-white py-5 px-6 rounded-t-3xl font-black outline-none"><option className="bg-[#000814]">Single</option><option className="bg-[#000814]">Married</option></select>
                </div>
              </div>
            )}

            {isSignup && role === 'driver' && step === 3 && (
              <div className="grid grid-cols-2 gap-6">
                {photos.map((photo, i) => (
                  <div key={i} className="aspect-square bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-white/5 relative overflow-hidden">
                    {photo ? <img src={photo} className="w-full h-full object-cover" /> : <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"><i className="fa-solid fa-camera text-white/10 text-3xl mb-3"></i><input type="file" className="hidden" onChange={(e) => handlePhotoUpload(e, i)} /></label>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-[11px] font-black text-red-500 uppercase tracking-[0.4em] text-center">{error}</div>}

          <div className="pt-8 space-y-8">
            <Button type="submit" variant="secondary" className="w-full py-8 text-[13px] font-black uppercase tracking-[0.6em] rounded-[2.5rem] shadow-2xl" loading={loading} disabled={loading}>
              {isForgot ? 'COMPLETE_RECOVERY' : (isSignup ? (step < 3 && role === 'driver' ? 'NEXT_PHASE' : 'INITIATE_DEPLOY') : 'AUTHORIZE_HANDSHAKE')}
            </Button>
            <div className="flex justify-between px-4">
              <button type="button" onClick={() => { setIsSignup(!isSignup); setStep(1); }} className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] hover:text-white transition-colors">{isSignup ? 'AUTH_EXISTING' : 'REGISTER_NEW'}</button>
              <button type="button" onClick={() => setIsForgot(!isForgot)} className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] hover:text-white transition-colors">{isForgot ? 'ABORT' : 'RECOVERY'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};