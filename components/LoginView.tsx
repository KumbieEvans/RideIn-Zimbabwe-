
import React, { useState } from 'react';
import { User, VehicleType } from '../types';
import { PASSENGER_CATEGORIES, FREIGHT_CATEGORIES, ZIM_CITIES } from '../constants';
import { Button, Input, Badge } from './Shared';
import { xanoService } from '../services/xano';
import { compressImage } from '../services/utils';

export const LoginView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState<'rider' | 'driver'>('rider');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Security Obfuscated state
  const [raw_p, setRawP] = useState('');
  const [raw_k, setRawK] = useState('');
  const [raw_n, setRawN] = useState('');
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

  /**
   * New Password Rules:
   * Minimum 8 chars, 1 Lower, 1 Upper, 1 Special, 1 Number
   */
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

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    if (!raw_p || !raw_k) {
        setError('Phone and access key are required');
        setLoading(false);
        return;
    }

    if (!validatePassword(raw_k)) {
        setError('Access key: min 8 chars, mixed case, number & special char required');
        setLoading(false);
        return;
    }

    if (isSignup && !raw_n.trim()) {
        setError('Identity signature required');
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
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Access Denied: Verify phone or key.');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = vehicleType === VehicleType.PASSENGER ? PASSENGER_CATEGORIES : FREIGHT_CATEGORIES;

  const renderStep1 = () => (
    <div className="space-y-6 animate-step-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
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
        {/* HONEYPOT: Trap browser autofill and specific rejected params */}
        <div className="absolute opacity-0 pointer-events-none -z-50 h-0 overflow-hidden" aria-hidden="true">
           <input type="text" name="email" tabIndex={-1} autoComplete="username" />
           <input type="text" name="reference-email" tabIndex={-1} autoComplete="off" />
           <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
        </div>

        {isSignup && (
          <>
            <Input 
              name="u_sig_id"
              id="u_sig_id"
              variant="glass" 
              label="Identity Signature" 
              placeholder="Full Name" 
              value={raw_n} 
              onChange={e => setRawN(e.target.value)} 
              icon="user"
              autoComplete="off"
              required
            />
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">City Sector</label>
              <div className="relative group">
                 <select value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border-b-2 border-slate-100 text-slate-900 font-bold focus:outline-none appearance-none focus:border-brand-blue transition-all">
                   {ZIM_CITIES.map((c: string) => <option key={c} value={c} className="text-slate-900 bg-white">{c}</option>)}
                 </select>
                 <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
              </div>
            </div>
          </>
        )}
        
        <Input 
          name="u_node_tel"
          id="u_node_tel"
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
        
        <Input 
          name="u_node_key"
          id="u_node_key"
          variant="glass" 
          label="Access Key" 
          type="password" 
          placeholder="Min 8 chars" 
          value={raw_k} 
          onChange={handlePasswordChange} 
          icon="lock" 
          autoComplete="one-time-code"
          required
        />
        <div className="flex flex-col gap-1 ml-1">
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${validatePassword(raw_k) ? 'fa-circle-check text-emerald-500' : 'fa-circle-info text-slate-300'} text-[9px]`}></i>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              Safety Check: Mixed case, number, and special character
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-step-in">
      <div>
         <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Elite Profile</h3>
         <p className="text-sm text-slate-500 mt-1">Authorization requirements for fleet nodes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input 
            name="driver-age"
            variant="glass" 
            label="Age" 
            type="number" 
            placeholder="28" 
            value={age} 
            onChange={e => setAge(e.target.value.replace(/\D/g, ''))} 
            inputMode="numeric"
            required
        />
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

      <Input name="religion" variant="glass" label="Religion (Optional)" placeholder="e.g. Christian" value={religion} onChange={e => setReligion(e.target.value)} icon="hands-praying" autoComplete="off" />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-step-in">
      <div>
         <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Details</h3>
         <p className="text-sm text-slate-500 mt-1">Mission capability and payload configuration.</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            type="button" 
            onClick={() => { setVehicleType(VehicleType.PASSENGER); setVehicleCategory(''); }} 
            className={`flex-1 py-2 text-[10px] font-bold transition-all rounded-md tracking-widest ${vehicleType === VehicleType.PASSENGER ? 'bg-brand-blue text-white' : 'text-slate-500'}`}
          >
            RIDE
          </button>
          <button 
            type="button" 
            onClick={() => { setVehicleType(VehicleType.FREIGHT); setVehicleCategory(''); }} 
            className={`flex-1 py-2 text-[10px] font-bold transition-all rounded-md tracking-widest ${vehicleType === VehicleType.FREIGHT ? 'bg-brand-blue text-white' : 'text-slate-500'}`}
          >
            FREIGHT
          </button>
       </div>

       <div className="grid grid-cols-2 gap-2">
         {currentCategories.map((cat: any) => (
           <div 
             key={cat.id}
             onClick={() => setVehicleCategory(cat.name)}
             className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${vehicleCategory === cat.name ? 'border-brand-orange bg-orange-50/30' : 'border-slate-50 bg-slate-50'}`}
           >
              <div className="flex items-center gap-3">
                <i className={`fa-solid fa-${cat.icon} text-sm ${vehicleCategory === cat.name ? 'text-brand-orange' : 'text-slate-300'}`}></i>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${vehicleCategory === cat.name ? 'text-slate-900' : 'text-slate-400'}`}>{cat.name}</span>
              </div>
              {vehicleCategory === cat.name && <i className="fa-solid fa-check text-brand-orange text-[10px]"></i>}
           </div>
         ))}
       </div>

       <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Verification Photos</label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(i => (
              <label key={i} className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-brand-blue transition-all overflow-hidden relative">
                {photos[i] ? (
                  <img src={photos[i]!} className="w-full h-full object-cover" loading="lazy" alt="Vehicle preview" />
                ) : (
                  <i className="fa-solid fa-camera text-slate-300"></i>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, i)} />
              </label>
            ))}
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 safe-top safe-bottom overflow-y-auto">
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
        <div className="pt-8 mb-12 flex flex-col items-center justify-center text-center">
           <h1 className="text-4xl font-black text-brand-blue italic tracking-tighter">RideIn</h1>
           <div className="h-1 w-10 bg-brand-orange mt-1 rounded-full"></div>
           <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300 mt-4">Safe Node Access</p>
        </div>

        <div className="flex-1 flex flex-col justify-center">
           {isSignup && role === 'driver' && (
             <div className="flex gap-1 mb-10">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-brand-blue' : 'bg-slate-100'}`}></div>
                ))}
             </div>
           )}

           <form onSubmit={handleNext} autoComplete="off">
              <div className="min-h-[360px]">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-brand-orange text-red-700 text-[10px] font-bold uppercase tracking-widest">
                  {error}
                </div>
              )}

              <div className="mt-10 space-y-4">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full py-5 rounded-2xl shadow-xl shadow-brand-blue/10 haptic-press" 
                  disabled={loading}
                >
                   {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (
                     step < 3 && isSignup && role === 'driver' ? 'Advance' : (isSignup ? 'Create Profile' : 'Initiate Session')
                   )}
                </Button>

                <button 
                  type="button" 
                  onClick={() => { setIsSignup(!isSignup); setStep(1); setError(''); }} 
                  className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-brand-blue transition-colors uppercase tracking-[0.2em]"
                >
                  {isSignup ? "Have an account? Log In" : "New Node? Create Account"}
                </button>
              </div>
           </form>
        </div>

        <div className="mt-auto pt-10 text-center">
           <p className="text-[9px] text-slate-300 uppercase tracking-widest leading-relaxed">
             Secure Phone Auth Protocol Active <br/>
             © 2025 RideIn Zimbabwe.
           </p>
        </div>
      </div>
    </div>
  );
};
