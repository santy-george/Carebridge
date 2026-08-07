export interface EducationArticle {
  id: string;
  title: string;
  tag: string;
  readMinutes: number;
  icon: string;
}

// Static reference library for V1 -- no personalization (no risk-screening
// data pipeline exists yet) and no CMS. A fixed, general-audience set of
// home-care topics rather than per-member "picked for you" recommendations.
export const EDUCATION_ARTICLES: EducationArticle[] = [
  {
    id: 'bp-at-home',
    title: 'Managing high blood pressure at home',
    tag: 'Heart health',
    readMinutes: 4,
    icon: 'heart',
  },
  {
    id: 'fall-prevention',
    title: 'Preventing falls at home',
    tag: 'Safety',
    readMinutes: 3,
    icon: 'shield',
  },
  {
    id: 'eating-well-after-60',
    title: 'Eating well after 60',
    tag: 'Nutrition',
    readMinutes: 5,
    icon: 'food',
  },
  {
    id: 'understanding-medications',
    title: 'Understanding your medications',
    tag: 'Medication',
    readMinutes: 3,
    icon: 'pill',
  },
];

export const EDUCATION_TIPS: string[] = [
  'Check your blood pressure at the same time each day for a more consistent trend.',
  'Keep pathways and stairs well lit to reduce fall risk at home.',
  'Pair each medication with an existing daily habit, like brushing your teeth.',
];
