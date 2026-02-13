export type LocaleCode = 'sq' | 'en' | 'de'

export type LocationDef = {
  key: string
  slugs: Record<LocaleCode, string>
  names: Record<LocaleCode, string>
  pickup: boolean
  airport: boolean
  avgPrice?: number
}

/** Location keys that have cover images in public/city (used for popular sections) */
export const POPULAR_LOCATION_KEYS = [
  'prishtina-airport',
  'prishtina',
  'prizren',
  'peja',
  'gjakova',
  'ferizaj',
  'mitrovica',
  'gjilan',
  'rahovec',
  'malisheva',
  'suhareka',
] as const

export const LOCATIONS: LocationDef[] = [
  { key: 'prishtina-airport', slugs: { sq: 'aeroporti-prishtines', en: 'pristina-airport', de: 'flughafen-pristina' }, names: { sq: 'Aeroporti i Prishtinës', en: 'Pristina Airport', de: 'Flughafen Pristina' }, pickup: true, airport: true, avgPrice: 30 },
  { key: 'prishtina', slugs: { sq: 'prishtine', en: 'pristina', de: 'pristina' }, names: { sq: 'Prishtinë', en: 'Pristina', de: 'Pristina' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'prizren', slugs: { sq: 'prizren', en: 'prizren', de: 'prizren' }, names: { sq: 'Prizren', en: 'Prizren', de: 'Prizren' }, pickup: true, airport: false, avgPrice: 28 },
  { key: 'peja', slugs: { sq: 'peje', en: 'peja', de: 'peja' }, names: { sq: 'Pejë', en: 'Peja', de: 'Peja' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'gjakova', slugs: { sq: 'gjakove', en: 'gjakova', de: 'gjakova' }, names: { sq: 'Gjakovë', en: 'Gjakova', de: 'Gjakova' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'ferizaj', slugs: { sq: 'ferizaj', en: 'ferizaj', de: 'ferizaj' }, names: { sq: 'Ferizaj', en: 'Ferizaj', de: 'Ferizaj' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'mitrovica', slugs: { sq: 'mitrovice', en: 'mitrovica', de: 'mitrovica' }, names: { sq: 'Mitrovicë e Jugut', en: 'South Mitrovica', de: 'Süd-Mitrovica' }, pickup: true, airport: false, avgPrice: 28 },
  { key: 'gjilan', slugs: { sq: 'gjilani', en: 'gjilan', de: 'gjilan' }, names: { sq: 'Gjilan', en: 'Gjilan', de: 'Gjilan' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'podujeva', slugs: { sq: 'podujevë', en: 'podujeva', de: 'podujeva' }, names: { sq: 'Podujevë', en: 'Podujeva', de: 'Podujeva' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'suhareka', slugs: { sq: 'suharekë', en: 'suhareka', de: 'suhareka' }, names: { sq: 'Suharekë', en: 'Suhareka', de: 'Suhareka' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'rahovec', slugs: { sq: 'rahoveci', en: 'rahovec', de: 'rahovec' }, names: { sq: 'Rahovec', en: 'Rahovec', de: 'Rahovec' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'lipjan', slugs: { sq: 'lipjani', en: 'lipjan', de: 'lipjan' }, names: { sq: 'Lipjan', en: 'Lipjan', de: 'Lipjan' }, pickup: true, airport: false, avgPrice: 24 },
  { key: 'malisheva', slugs: { sq: 'malishevë', en: 'malisheva', de: 'malisheva' }, names: { sq: 'Malishevë', en: 'Malisheva', de: 'Malisheva' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'skenderaj', slugs: { sq: 'skënderaj', en: 'skenderaj', de: 'skenderaj' }, names: { sq: 'Skenderaj', en: 'Skenderaj', de: 'Skenderaj' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'vushtrri', slugs: { sq: 'vushtrri', en: 'vushtrri', de: 'vushtrri' }, names: { sq: 'Vushtrri', en: 'Vushtrri', de: 'Vushtrri' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'decan', slugs: { sq: 'deçan', en: 'decan', de: 'decan' }, names: { sq: 'Deçan', en: 'Decan', de: 'Decan' }, pickup: true, airport: false, avgPrice: 28 },
  { key: 'istog', slugs: { sq: 'istog', en: 'istog', de: 'istog' }, names: { sq: 'Istog', en: 'Istog', de: 'Istog' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'kamenica', slugs: { sq: 'kamenicë', en: 'kamenica', de: 'kamenica' }, names: { sq: 'Kamenicë', en: 'Kamenica', de: 'Kamenica' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'gracanica', slugs: { sq: 'graçanicë', en: 'gracanica', de: 'gracanica' }, names: { sq: 'Graçanicë', en: 'Gracanica', de: 'Gracanica' }, pickup: true, airport: false, avgPrice: 24 },
  { key: 'dragash', slugs: { sq: 'dragash', en: 'dragash', de: 'dragash' }, names: { sq: 'Dragash', en: 'Dragash', de: 'Dragash' }, pickup: true, airport: false, avgPrice: 29 },
  { key: 'shtime', slugs: { sq: 'shtimë', en: 'shtime', de: 'shtime' }, names: { sq: 'Shtime', en: 'Shtime', de: 'Shtime' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'obiliq', slugs: { sq: 'obiliq', en: 'obiliq', de: 'obiliq' }, names: { sq: 'Obiliq', en: 'Obiliq', de: 'Obiliq' }, pickup: true, airport: false, avgPrice: 24 },
  { key: 'fushe-kosove', slugs: { sq: 'fushë-kosovë', en: 'fushe-kosove', de: 'fushe-kosove' }, names: { sq: 'Fushë Kosovë', en: 'Fushe Kosove', de: 'Fushe Kosove' }, pickup: true, airport: false, avgPrice: 23 },
  { key: 'kacanik', slugs: { sq: 'kaçanik', en: 'kacanik', de: 'kacanik' }, names: { sq: 'Kaçanik', en: 'Kacanik', de: 'Kacanik' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'hani-i-elezit', slugs: { sq: 'hani-i-elezit', en: 'hani-i-elezit', de: 'hani-i-elezit' }, names: { sq: 'Han i Elezit', en: 'Hani i Elezit', de: 'Hani i Elezit' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'klina', slugs: { sq: 'klinë', en: 'klina', de: 'klina' }, names: { sq: 'Klinë', en: 'Klina', de: 'Klina' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'junik', slugs: { sq: 'junik', en: 'junik', de: 'junik' }, names: { sq: 'Junik', en: 'Junik', de: 'Junik' }, pickup: true, airport: false, avgPrice: 28 },
  { key: 'klokot', slugs: { sq: 'kllokot', en: 'klokot', de: 'klokot' }, names: { sq: 'Kllokot', en: 'Klokot', de: 'Klokot' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'leposavic', slugs: { sq: 'leposaviq', en: 'leposavic', de: 'leposavic' }, names: { sq: 'Leposaviq', en: 'Leposavic', de: 'Leposavic' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'zubin-potok', slugs: { sq: 'zubin-potok', en: 'zubin-potok', de: 'zubin-potok' }, names: { sq: 'Zubin Potok', en: 'Zubin Potok', de: 'Zubin Potok' }, pickup: true, airport: false, avgPrice: 28 },
  { key: 'zvecan', slugs: { sq: 'zveçan', en: 'zvecan', de: 'zvecan' }, names: { sq: 'Zveçan', en: 'Zvecan', de: 'Zvecan' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'ranillug', slugs: { sq: 'ranillug', en: 'ranillug', de: 'ranillug' }, names: { sq: 'Ranillug', en: 'Ranillug', de: 'Ranillug' }, pickup: true, airport: false, avgPrice: 24 },
  { key: 'partesh', slugs: { sq: 'partesh', en: 'partesh', de: 'partesh' }, names: { sq: 'Partesh', en: 'Partesh', de: 'Partesh' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'mamusha', slugs: { sq: 'mamushë', en: 'mamusha', de: 'mamusha' }, names: { sq: 'Mamushë', en: 'Mamusha', de: 'Mamusha' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'novoberda', slugs: { sq: 'novobërdë', en: 'novoberda', de: 'novoberda' }, names: { sq: 'Novobërdë', en: 'Novoberda', de: 'Novoberda' }, pickup: true, airport: false, avgPrice: 27 },
  { key: 'drenas', slugs: { sq: 'drenas', en: 'drenas', de: 'drenas' }, names: { sq: 'Drenas', en: 'Drenas', de: 'Drenas' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'shtrpce', slugs: { sq: 'shtërpca', en: 'shtrpce', de: 'shtrpce' }, names: { sq: 'Shtërpcë', en: 'Shtrpce', de: 'Shtrpce' }, pickup: true, airport: false, avgPrice: 26 },
  { key: 'viti', slugs: { sq: 'viti', en: 'viti', de: 'viti' }, names: { sq: 'Viti', en: 'Viti', de: 'Viti' }, pickup: true, airport: false, avgPrice: 25 },
  { key: 'mitrovica-veriut', slugs: { sq: 'mitrovicë-e-veriut', en: 'mitrovica-north', de: 'mitrovica-norden' }, names: { sq: 'Mitrovicë e Veriut', en: 'North Mitrovica', de: 'Nord-Mitrovica' }, pickup: true, airport: false, avgPrice: 28 },
]
