export interface ContentSection {
  heading: string;
  paragraphs: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RelatedLink {
  label: string;
  href: string;
}

export interface EntityPageContent {
  slug: string;
  title: string;
  metaDescription: string;
  kicker: string;
  lead: string;
  sections: ContentSection[];
  faqs: FaqItem[];
  relatedLinks: RelatedLink[];
  useCases?: string[];
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  extended?: string;
  related?: string[];
}

export interface StockPageContent {
  ticker: string;
  name: string;
  metaDescription: string;
  lead: string;
  sections: ContentSection[];
  faqs: FaqItem[];
  relatedTickers: string[];
  relatedTopics: RelatedLink[];
}

export interface ComparePageContent {
  slug: string;
  competitor: string;
  title: string;
  metaDescription: string;
  lead: string;
  motivefxWins: string[];
  competitorWins: string[];
  sections: ContentSection[];
  faqs: FaqItem[];
}
