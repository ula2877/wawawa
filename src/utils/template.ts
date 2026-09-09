export const SAMPLE_VALUES: Record<string, string> = {
  name: 'Budi Santoso',
  idpel: '123456789012',
  phone: '+62 812-3456-789',
  email: 'budi.santoso@gmail.com',
  customer_type: 'Residential',
  tariff: 'R1',
  power: '900',
  region: 'Jakarta',
  ulp: 'Kebayoran',
  groups: 'Customers, Jakarta, Residential',
};

export function replaceVariables(text: string, values: Record<string, string> = SAMPLE_VALUES): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}

export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}
