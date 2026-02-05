
import React, { useState, useRef, useEffect } from 'react';
import { User, VehicleType } from '../types';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES, ZIM_CITIES } from '../constants';
import { Button, Input, Badge } from './Shared';
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
  const [success, setSuccess] = useState('');

  // Security Obfuscated state
  const [raw_p, setRawP] = useState('');
  const [raw_k, setRawK] = useState('');
  const [raw_n, setRawN] = useState('');
  const [raw_code, setRawCode] = useState('');
  const [city, setCity] = useState('Harare');
  
  // Driver Specific
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [religion, setReligion] = useState('');
  const [personality, setPersonality] = useState<'Talkative' | 'Quiet'>('Talkative');
  
  // Vehicle Specific
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.PASSENGER);
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) {
      if (forgotStep === 1) handleRequestReset();
      else handleCompleteReset();
      return;
    }
    if (isSignup && role === 'driver' && step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    setRawP(val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawK(e.target.value);
  };

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pass);
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
      } catch (err) {
        console.error("Compression failed:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRequestReset = async () => {
    if (!raw_p) {
      setError('Mobile signal required for protocol reset');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formattedPhone = `+263${raw_p}`;
      await xanoService.requestPasswordReset(formattedPhone);
      setForgotStep(2);
      setSuccess('Tactical reset code dispatched via SMS');
    } catch (err: any) {
      setError(err.message || 'Node communication failure during reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    if (!raw_code || !raw_k) {
      setError('Both code and new access key required');
      return;
    }
    if (!validatePassword(raw_k)) {
      setError('Protocol mismatch: Access key requirements not met');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formattedPhone = `+263${raw_p}`;
      const user = await xanoService.completePasswordReset(formattedPhone, raw_code, raw_k);
      if (user) onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Invalid authorization code or node timeout');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!raw_p || !raw_k) {
        setError('Phone and access key are required');
        setLoading(false);
        return;
    }

    if (!validatePassword(raw_k)) {
        setError('Access key must be min 8 characters with at least 1 uppercase, 1 lowercase, 1 special character and 1 number.');
        setLoading(false);
        return;
    }

    if (isSignup && !raw_n.trim()) {
        setError('Identity signature required for enrollment');
        setLoading(false);
        return;
    }

    const formattedPhone = `+263${raw_p}`;

    try {
      let user;
      if (isSignup) {
        const userData: any = { 
          name: raw_n, 
          phone: formattedPhone, 
          role, 
          city 
        };
        if (role === 'driver') {
          userData.age = parseInt(age);
          userData.gender = gender;
          userData.maritalStatus = maritalStatus;
          userData.religion = religion;
          userData.personality = personality;
          const validPhotos = photos.filter(p => p !== null) as string[];
          userData.vehicle = {
            type: vehicleType,
            category: vehicleCategory || (vehicleType === VehicleType.PASSENGER ? PASSENGER_CATEGORIES[0].name : FREIGHT_CATEGORIES[0].name),
            photos: validPhotos.length ? validPhotos : ['https://picsum.photos/seed/car_default/400/300']
          };
        }
        user = await xanoService.signup(userData, raw_k);
      } else {
        user = await xanoService.login(formattedPhone, raw_k);
      }
      
      if (user) {
        onLogin(user);
      } else {
        throw new Error("Invalid response from authorization node.");
      }
    } catch (err: any) {
      console.error("[Auth] Connection error details:", err);
      setError(err.message || 'Access Denied: Please verify your phone and key.');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = vehicleType === VehicleType.PASSENGER ? PASSENGER_CATEGORIES : FREIGHT_CATEGORIES;

  const renderForgot = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight italic">Reset Access Key</h2>
        <p className="text-slate-500 text-sm mt-1">
          {forgotStep === 1 
            ? "Enter your tactical contact number to receive a reset code." 
            : "Enter the code received and your new high-security access key."}
        </p>
      </div>

      <div className="space-y-4">
        {forgotStep === 1 ? (
          <Input 
            variant="glass" 
            label="Phone Number" 
            placeholder="7..." 
            value={raw_p} 
            onChange={handlePhoneChange} 
            icon="phone" 
            type="tel" 
            prefixText="+263" 
            inputMode="numeric" 
            autoComplete="off" 
            required 
          />
        ) : (
          <>
            <Input 
              variant="glass" 
              label="Reset Code" 
              placeholder="000000" 
              value={raw_code} 
              onChange={e => setRawCode(e.target.value.replace(/\D/g, ''))} 
              icon="hashtag" 
              inputMode="numeric" 
              autoComplete="one-time-code" 
              required 
            />
            <Input 
              variant="glass" 
              label="New Access Key" 
              type="password" 
              placeholder="8+ Mixed Chars" 
              value={raw_k} 
              onChange={handlePasswordChange} 
              icon="lock" 
              autoComplete="new-password" 
              required 
            />
            <div className="flex items-center gap-2 ml-1">
              <i className={`fa-solid ${validatePassword(raw_k) ? 'fa-circle-check text-emerald-500' : 'fa-circle-info text-slate-300'} text-[9px]`}></i>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Protocol: Mixed case, number, and special char required</p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight italic">
          {isSignup ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {isSignup ? "Join the Zimbabwe tactical mobility network." : "Log in to your tactical node."}
        </p>
      </div>

      {isSignup && (
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            type="button" 
            onClick={() => setRole('rider')} 
            className={`flex-1 py-2 text-[10px] font-bold transition-all rounded-md tracking-widest ${role === 'rider' ? 'bg-brand-blue text-white' : 'text-slate-500'}`}
          >
            RIDER
          </button>
          <button 
            type="button" 
            onClick={() => setRole('driver')} 
            className={`flex-1 py-2 text-[10px] font-bold transition-all rounded-md tracking-widest ${role === 'driver' ? 'bg-brand-blue text-white' : 'text-slate-500'}`}
          >
            DRIVER
          </button>
        </div>
      )}

      <div className="space-y-4">
        {isSignup && (
          <>
            <Input variant="glass" label="Identity Signature" placeholder="Full Name" value={raw_n} onChange={e => setRawN(e.target.value)} icon="user" autoComplete="off" required />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">City Sector</label>
              <div className="relative">
                 <select value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border-b-2 border-slate-100 text-slate-900 font-bold focus:outline-none appearance-none focus:border-brand-blue transition-all">
                   {ZIM_CITIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
              </div>
            </div>
          </>
        )}
        
        <Input variant="glass" label="Phone Number" placeholder="7..." value={raw_p} onChange={handlePhoneChange} icon="phone" type="tel" prefixText="+263" inputMode="numeric" autoComplete="off" required />
        <Input variant="glass" label="Access Key" type="password" placeholder="8+ Mixed Chars" value={raw_k} onChange={handlePasswordChange} icon="lock" autoComplete="one-time-code" required />
        
        <div className="flex items-center justify-between ml-1">
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${validatePassword(raw_k) ? 'fa-circle-check text-emerald-500' : 'fa-circle-info text-slate-300'} text-[9px]`}></i>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Protocol: Security level optimal</p>
          </div>
          {!isSignup && (
            <button 
              type="button" 
              onClick={() => { setIsForgot(true); setForgotStep(1); setError(''); setSuccess(''); }}
              className="text-[9px] font-black text-brand-orange uppercase tracking-widest hover:underline"
            >
              Forgot Access Key?
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
         <h3 className="text-2xl font-bold text-slate-900 tracking-tight italic">Elite Profile</h3>
         <p className="text-sm text-slate-500 mt-1">Authorization requirements for fleet nodes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input variant="glass" label="Age" type="number" placeholder="28" value={age} onChange={e => setAge(e.target.value.replace(/\D/g, ''))} inputMode="numeric" required />
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Gender</label>
          <div className="relative">
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border-b-2 border-slate-100 text-slate-900 font-bold focus:outline-none appearance-none focus:border-brand-blue">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Marital Status</label>
          <div className="relative">
            <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border-b-2 border-slate-100 text-slate-900 font-bold focus:outline-none appearance-none focus:border-brand-blue">
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Personality</label>
          <div className="relative">
            <select value={personality} onChange={e => setPersonality(e.target.value as any)} className="w-full px-4 py-4 bg-slate-50 border-b-2 border-slate-100 text-slate-900 font-bold focus:outline-none appearance-none focus:border-brand-blue">
              <option value="Talkative">Talkative</option>
              <option value="Quiet">Quiet</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
          </div>
        </div>
      </div>
      <Input variant="glass" label="Religion (Optional)" placeholder="e.g. Christian" value={religion} onChange={e => setReligion(e.target.value)} icon="hands-praying" autoComplete="off" />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
       <div className="grid grid-cols-2 gap-2">
         {currentCategories.map((cat: any) => (
           <div key={cat.id} onClick={() => setVehicleCategory(cat.name)} className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${vehicleCategory === cat.name ? 'border-brand-orange bg-orange-50/30' : 'border-slate-50 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <i className={`fa-solid fa-${cat.icon} text-sm ${vehicleCategory === cat.name ? 'text-brand-orange' : 'text-slate-300'}`}></i>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${vehicleCategory === cat.name ? 'text-slate-900' : 'text-slate-400'}`}>{cat.name}</span>
              </div>
           </div>
         ))}
       </div>

       <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map(i => (
            <label key={i} className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-brand-blue transition-all overflow-hidden relative">
              {photos[i] ? <img src={photos[i]!} className="w-full h-full object-cover" alt="Preview" /> : <i className="fa-solid fa-camera text-slate-300"></i>}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, i)} />
            </label>
          ))}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex-1 max-w-md mx-auto w-full bg-white p-8 flex flex-col pt-16 relative overflow-hidden">
        {/* Background tactical elements */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <i className="fa-solid fa-microchip text-[12rem] rotate-12"></i>
        </div>

        <div className="mb-12 select-none relative z-10">
          <h1 className="text-5xl font-black text-brand-blue italic tracking-tighter">RideIn</h1>
          <div className="h-1.5 w-12 bg-brand-orange mt-2 rounded-full shadow-[0_4px_10px_rgba(255,95,0,0.3)]"></div>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-6 text-red-600 text-[10px] font-black uppercase tracking-widest animate-fade-in flex items-center gap-3"><i className="fa-solid fa-triangle-exclamation"></i>{error}</div>}
        {success && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6 text-emerald-600 text-[10px] font-black uppercase tracking-widest animate-fade-in flex items-center gap-3"><i className="fa-solid fa-circle-check"></i>{success}</div>}

        <form onSubmit={handleNext} className="flex-1 flex flex-col relative z-10">
          {isForgot ? renderForgot() : (step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3())}

          <div className="mt-auto pt-12 space-y-4">
            <Button type="submit" variant="secondary" className="w-full py-6 text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-brand-orange/20" loading={loading}>
              {isForgot 
                ? (forgotStep === 1 ? 'Dispatch Code' : 'Update Access Protocol')
                : (step === 3 || (!isSignup) ? (isSignup ? 'Complete Enrollment' : 'Authorize Node') : 'Next Protocol')}
            </Button>

            {!isForgot && step === 1 && (
              <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); setSuccess(''); }} className="w-full py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-brand-blue transition-colors">
                {isSignup ? "Existing Node? Login" : "New Node? Enrollment"}
              </button>
            )}

            {isForgot && (
              <button type="button" onClick={() => { setIsForgot(false); setForgotStep(1); setError(''); setSuccess(''); }} className="w-full py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-brand-blue transition-colors">
                Return to Base Authorization
              </button>
            )}

            {isSignup && step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="w-full py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Previous Phase</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
