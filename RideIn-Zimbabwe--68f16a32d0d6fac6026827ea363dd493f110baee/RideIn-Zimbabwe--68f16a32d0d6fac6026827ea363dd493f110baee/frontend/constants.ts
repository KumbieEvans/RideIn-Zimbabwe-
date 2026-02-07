import { PassengerCategory, FreightCategory } from './types';

export const ZIM_CITIES = [
  'Harare', 'Bulawayo', 'Gweru', 'Mutare', 'Norton', 'Chegutu', 
  'Kwekwe', 'Chivhu', 'Masvingo', 'Beitbridge', 'Kadoma', 'Mvuma', 
  'Marondera', 'Ruwa', 'Chipinge', 'Chiredzi', 'Zvishavane', 
  'Shurugwi', 'Mazoe', 'Victoria Falls', 'Karoi', 'Shamva', 
  'Chinhoyi', 'Rusape', 'Mutoko'
];

export const PASSENGER_CATEGORIES = [
  { id: 'standard', name: PassengerCategory.STANDARD, icon: 'car', basePrice: 1.0 },
  { id: 'premium', name: PassengerCategory.PREMIUM, icon: 'couch', basePrice: 2.5 },
  { id: 'luxury', name: PassengerCategory.LUXURY, icon: 'crown', basePrice: 5.0 }
];

export const FREIGHT_CATEGORIES = [
  { id: 'bike', name: FreightCategory.BIKE, icon: 'motorcycle', payload: 'Up to 20kg', basePrice: 0.5 },
  { id: '1-2t', name: FreightCategory.TONNE_1_2, icon: 'truck-pickup', payload: 'Up to 2 Tonnes', basePrice: 2.0 },
  { id: '3-5t', name: FreightCategory.TONNE_3_5, icon: 'truck', payload: 'Up to 5 Tonnes', basePrice: 4.0 },
  { id: '7-10t', name: FreightCategory.TONNE_7_10, icon: 'truck-moving', payload: 'Up to 10 Tonnes', basePrice: 8.0 }
];