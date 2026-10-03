export interface FactEntry {
  id: string;
  category: string;
  statement: string;
  explanation: string;
  source: {
    label: string;
    url: string;
  };
}
