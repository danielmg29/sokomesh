// Reference data for Kenyan addresses: the 47 counties (Constitution of Kenya 2010, First Schedule).

export const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir', 'Mandera', 'Marsabit',
  'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
  "Murang'a", 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo',
  'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia',
  'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi',
] as const

export type County = (typeof KENYA_COUNTIES)[number]

/**
 * Towns for the address place picker, with approximate town-centre coordinates (WGS84, four decimals).
 * A convenience for choosing `location_point` until a geocoder is connected; the API checks the bounds.
 */
export const KENYA_TOWNS = [
  { name: 'Nairobi', county: 'Nairobi', lat: -1.2864, lng: 36.8172 },
  { name: 'Mombasa', county: 'Mombasa', lat: -4.0435, lng: 39.6682 },
  { name: 'Kisumu', county: 'Kisumu', lat: -0.0917, lng: 34.768 },
  { name: 'Nakuru', county: 'Nakuru', lat: -0.3031, lng: 36.08 },
  { name: 'Eldoret', county: 'Uasin Gishu', lat: 0.5143, lng: 35.2698 },
  { name: 'Thika', county: 'Kiambu', lat: -1.0333, lng: 37.0693 },
  { name: 'Naivasha', county: 'Nakuru', lat: -0.7167, lng: 36.4333 },
  { name: 'Nyeri', county: 'Nyeri', lat: -0.4201, lng: 36.9476 },
  { name: 'Machakos', county: 'Machakos', lat: -1.5177, lng: 37.2634 },
  { name: 'Meru', county: 'Meru', lat: 0.047, lng: 37.6496 },
  { name: 'Embu', county: 'Embu', lat: -0.5389, lng: 37.457 },
  { name: 'Kitale', county: 'Trans-Nzoia', lat: 1.0157, lng: 35.0062 },
  { name: 'Kakamega', county: 'Kakamega', lat: 0.2827, lng: 34.7519 },
  { name: 'Kericho', county: 'Kericho', lat: -0.3689, lng: 35.2863 },
  { name: 'Kisii', county: 'Kisii', lat: -0.6817, lng: 34.7667 },
  { name: 'Nanyuki', county: 'Laikipia', lat: 0.0167, lng: 37.0667 },
  { name: 'Malindi', county: 'Kilifi', lat: -3.2192, lng: 40.1169 },
  { name: 'Garissa', county: 'Garissa', lat: -0.4532, lng: 39.6461 },
  { name: 'Isiolo', county: 'Isiolo', lat: 0.3546, lng: 37.5822 },
  { name: 'Lodwar', county: 'Turkana', lat: 3.1191, lng: 35.5973 },
] as const
