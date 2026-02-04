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

  // Form State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
    setPhone(val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Alphanumeric only, max 8 chars
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    setPassword(val);
  };

  const validatePassword = (pass: string) => {
    // Exactly 8 chars, at least one letter, at least one number
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8}$/;
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
    
    if (!phone || !password) {
        setError('Phone and password are required');
        setLoading(false);
        return;
    }

    if (!validatePassword(password)) {
        setError('Password must be exactly 8 characters with a mix of letters and numbers');
        setLoading(false);
        return;
    }

    if (isSignup) {
        if (!name.trim()) {
            setError('Full name is required');
            setLoading(false);
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            setError('A valid email address is required');
            setLoading(false);
            return;
        }
    }

    const formattedPhone = `+263${phone}`;

    try {
      let user;
      if (isSignup) {
        const userData: any = { name, email, phone: formattedPhone, role, city };
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
        user = await xanoService.signup(userData, password);
      } else {
        user = await xanoService.login(formattedPhone, password);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
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
          {isSignup ? "Fill in your details to start using RideIn." : "Log in to your account to continue."}
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
            <Input 
              variant="glass" 
              label="Full Name" 
              placeholder="e.g. Tinashe Maphosa" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              icon="user"
              required
            />

            <Input 
              variant="glass" 
              label="Email Address" 
              placeholder="e.g. tinashe@email.com" 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              icon="envelope"
              required
            />
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">City</label>
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
          variant="glass" 
          label="Phone Number" 
          placeholder="7..." 
          value={phone} 
          onChange={handlePhoneChange} 
          icon="phone" 
          type="tel"
          prefixText="+263"
          inputMode="numeric"
          required
        />
        
        <Input 
          variant="glass" 
          label="Password" 
          type="password" 
          placeholder="8 characters (letters & numbers)" 
          value={password} 
          onChange={handlePasswordChange} 
          icon="lock" 
          maxLength={8}
          required
        />
        <div className="flex items-start gap-2 ml-1">
          <i className={`fa-solid fa-circle-info text-[9px] mt-0.5 ${validatePassword(password) ? 'text-emerald-500' : 'text-slate-300'}`}></i>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
            Use exactly 8 characters with at least one letter and one number
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-step-in">
      <div>
         <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Driver Profile</h3>
         <p className="text-sm text-slate-500 mt-1">Please provide some details for your profile.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input 
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

      <Input variant="glass" label="Religion (Optional)" placeholder="e.g. Christian" value={religion} onChange={e => setReligion(e.target.value)} icon="hands-praying" />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-step-in">
      <div>
         <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Vehicle Details</h3>
         <p className="text-sm text-slate-500 mt-1">Tell us what vehicle you will be using.</p>
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
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Vehicle Photos</label>
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
        {/* Header Branding */}
        <div className="pt-8 mb-12 flex flex-col items-center justify-center text-center">
           <h1 className="text-4xl font-black text-brand-blue italic tracking-tighter">RideIn</h1>
           <div className="h-1 w-10 bg-brand-orange mt-1 rounded-full"></div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
           {isSignup && role === 'driver' && (
             <div className="flex gap-1 mb-10">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-brand-blue' : 'bg-slate-100'}`}></div>
                ))}
             </div>
           )}

           <form onSubmit={handleNext}>
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
                  className="w-full py-5 rounded-2xl shadow-xl shadow-brand-blue/10" 
                  disabled={loading}
                >
                   {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (
                     step < 3 && isSignup && role === 'driver' ? 'Next' : (isSignup ? 'Create Account' : 'Sign In')
                   )}
                </Button>

                <button 
                  type="button" 
                  onClick={() => { setIsSignup(!isSignup); setStep(1); setError(''); }} 
                  className="w-full py-4 text-[10px] font-bold text-slate-400 hover:text-brand-blue transition-colors uppercase tracking-[0.2em]"
                >
                  {isSignup ? "Already have an account? Log In" : "New to RideIn? Create an account"}
                </button>
              </div>
           </form>
        </div>

        {/* Footer info */}
        <div className="mt-auto pt-10 text-center">
           <p className="text-[9px] text-slate-300 uppercase tracking-widest leading-relaxed">
             Safe and secure access for your journey. <br/>
             © 2025 RideIn Zimbabwe.
           </p>
        </div>
      </div>
    </div>
  );
};