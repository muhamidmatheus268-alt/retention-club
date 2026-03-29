export const BRANDS = {
  denavita: {
    slug: 'denavita',
    name: 'Denavita',
    primaryColor: '#54b101',
    secondaryColor: '#367300',
    accentColor: '#ff8800',
    fontFamily: "'Poppins', sans-serif",
    defaultTheme: 'light',
  },
}

export function getBrand(slug) {
  return BRANDS[slug] || {
    slug,
    name: '',
    primaryColor: '#E8642A',
    secondaryColor: '#c9501e',
    accentColor: '#E8642A',
    fontFamily: 'inherit',
    defaultTheme: 'dark',
  }
}
