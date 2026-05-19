import { useMemo } from 'react';
import type { Theme, ThemeName } from '../types';

type ThemeDef = { name: string; light: Theme; dark: Theme };

export const PAWRA_THEMES: Record<ThemeName, ThemeDef> = {
  sky: {
    name: 'Sky',
    light: {
      bg: '#F5EFE2',
      bgRaised: '#FBF6EB',
      surface: '#FFFFFF',
      surfaceAlt: '#EBE3D2',
      ink: '#0F1E2E',
      inkSoft: '#3A4D62',
      inkMuted: '#7A8DA1',
      hairline: 'rgba(20,40,70,0.10)',
      brand: '#3E8EC9',
      brandSoft: '#CFE4F4',
      brandInk: '#0F4870',
      accent: '#C97A3A',
      accentSoft: '#F0D8BD',
      warn: '#C97A3A',
      danger: '#C84A48',
      success: '#3E9E78',
    },
    dark: {
      bg: '#0A1320', bgRaised: '#101B2C', surface: '#152339', surfaceAlt: '#1D2D45',
      ink: '#E8EFF7', inkSoft: '#B0C0D2', inkMuted: '#7A8DA1',
      hairline: 'rgba(232,239,247,0.08)',
      brand: '#7BB8E0', brandSoft: '#102438', brandInk: '#CFE4F4',
      accent: '#E8A87E', accentSoft: '#3A2415',
      warn: '#E0995B', danger: '#D87455', success: '#7CC8A0',
    },
  },
  mist: {
    name: 'Mist',
    light: {
      bg: '#F2EBDC', bgRaised: '#F8F2E5', surface: '#FFFFFF', surfaceAlt: '#E5DCC8',
      ink: '#13201F', inkSoft: '#3A4D4A', inkMuted: '#7A8C8A',
      hairline: 'rgba(20,40,40,0.09)',
      brand: '#5A8FA8', brandSoft: '#D2E0EA', brandInk: '#1E4A62',
      accent: '#B86A52', accentSoft: '#EDD0C5',
      warn: '#C97A3A', danger: '#B8453A', success: '#5A8F75',
    },
    dark: {
      bg: '#0C1414', bgRaised: '#121C1B', surface: '#182423', surfaceAlt: '#212E2C',
      ink: '#E5EDEB', inkSoft: '#AFBDBA', inkMuted: '#788A87',
      hairline: 'rgba(229,237,235,0.08)',
      brand: '#85B5CC', brandSoft: '#142838', brandInk: '#D2E0EA',
      accent: '#D89280', accentSoft: '#3A1F18',
      warn: '#E0995B', danger: '#D87455', success: '#85BBA0',
    },
  },
  azure: {
    name: 'Azure',
    light: {
      bg: '#F8F0DC', bgRaised: '#FCF5E5', surface: '#FFFFFF', surfaceAlt: '#EEE2C5',
      ink: '#0E1830', inkSoft: '#33425E', inkMuted: '#7484A0',
      hairline: 'rgba(20,30,60,0.10)',
      brand: '#2E6FB8', brandSoft: '#C3DAF0', brandInk: '#103A6E',
      accent: '#D88040', accentSoft: '#F2D5B3',
      warn: '#C97A3A', danger: '#C44848', success: '#3E9E78',
    },
    dark: {
      bg: '#08111F', bgRaised: '#0E1A2E', surface: '#13243C', surfaceAlt: '#1B2E48',
      ink: '#E6EEF8', inkSoft: '#A8BCD2', inkMuted: '#7484A0',
      hairline: 'rgba(230,238,248,0.08)',
      brand: '#6FA9D8', brandSoft: '#0E2A48', brandInk: '#C3DAF0',
      accent: '#E0A070', accentSoft: '#3A2418',
      warn: '#E0995B', danger: '#D87455', success: '#7CC8A0',
    },
  },
  porcelain: {
    name: 'Porcelain',
    light: {
      bg: '#FAF3E4', bgRaised: '#FEF8E8', surface: '#FFFFFF', surfaceAlt: '#F0E7CE',
      ink: '#102438', inkSoft: '#3A506C', inkMuted: '#80909F',
      hairline: 'rgba(20,40,60,0.09)',
      brand: '#7AB6D8', brandSoft: '#DCEAF2', brandInk: '#1F5478',
      accent: '#D88A50', accentSoft: '#F2DCC2',
      warn: '#C97A3A', danger: '#C84A48', success: '#5FAA8F',
    },
    dark: {
      bg: '#0B1620', bgRaised: '#121F2C', surface: '#182838', surfaceAlt: '#213245',
      ink: '#E8F0F6', inkSoft: '#B0C2D0', inkMuted: '#80909F',
      hairline: 'rgba(232,240,246,0.08)',
      brand: '#9AC8E2', brandSoft: '#152838', brandInk: '#DCEAF2',
      accent: '#E8A678', accentSoft: '#3A2418',
      warn: '#E0995B', danger: '#D87455', success: '#7CC8A0',
    },
  },
  clay: {
    name: 'Clay',
    light: {
      bg: '#F5EFE6', bgRaised: '#FBF6EE', surface: '#FFFFFF', surfaceAlt: '#EFE7DA',
      ink: '#2A1F17', inkSoft: '#5A4A3D', inkMuted: '#8A7868',
      hairline: 'rgba(72,52,36,0.10)',
      brand: '#B8553A', brandSoft: '#E8C9BD', brandInk: '#7A2E1B',
      accent: '#5C7A4A', accentSoft: '#D4DCC4',
      warn: '#C9803A', danger: '#A8392A', success: '#5C7A4A',
    },
    dark: {
      bg: '#15110D', bgRaised: '#1E1813', surface: '#251D17', surfaceAlt: '#2E251D',
      ink: '#F2EAD9', inkSoft: '#C9BCA8', inkMuted: '#8A7A66',
      hairline: 'rgba(242,234,217,0.08)',
      brand: '#D87455', brandSoft: '#3A1F15', brandInk: '#F2C5B3',
      accent: '#94B07F', accentSoft: '#2A3622',
      warn: '#E0995B', danger: '#D87455', success: '#94B07F',
    },
  },
  olive: {
    name: 'Olive',
    light: {
      bg: '#F0EFE4', bgRaised: '#F8F7EC', surface: '#FFFFFF', surfaceAlt: '#E5E4D4',
      ink: '#1F2317', inkSoft: '#4A4F3D', inkMuted: '#7A8068',
      hairline: 'rgba(45,55,30,0.10)',
      brand: '#5C7A4A', brandSoft: '#D4DCC4', brandInk: '#2F4426',
      accent: '#B8553A', accentSoft: '#E8C9BD',
      warn: '#C9803A', danger: '#A8392A', success: '#5C7A4A',
    },
    dark: {
      bg: '#10120C', bgRaised: '#181B12', surface: '#1F2317', surfaceAlt: '#272B1D',
      ink: '#EBEAD8', inkSoft: '#BFC3A8', inkMuted: '#7E8268',
      hairline: 'rgba(235,234,216,0.08)',
      brand: '#94B07F', brandSoft: '#2A3622', brandInk: '#D4DCC4',
      accent: '#D87455', accentSoft: '#3A1F15',
      warn: '#E0995B', danger: '#D87455', success: '#94B07F',
    },
  },
  midnight: {
    name: 'Midnight',
    light: {
      bg:         '#0A0A0A',
      bgRaised:   '#111111',
      surface:    '#1A1A1A',
      surfaceAlt: '#242424',
      ink:        '#F5F5F5',
      inkSoft:    '#909090',
      inkMuted:   '#585858',
      hairline:   'rgba(61,126,247,0.14)',
      brand:      '#3D7EF7',
      brandSoft:  '#0C1A38',
      brandInk:   '#A8C4FC',
      accent:     '#6CA0F0',
      accentSoft: '#0C1828',
      warn:       '#E8A84A',
      danger:     '#E05555',
      success:    '#3EAA84',
    },
    dark: {
      bg:         '#0A0A0A',
      bgRaised:   '#111111',
      surface:    '#1A1A1A',
      surfaceAlt: '#242424',
      ink:        '#F5F5F5',
      inkSoft:    '#909090',
      inkMuted:   '#585858',
      hairline:   'rgba(61,126,247,0.14)',
      brand:      '#3D7EF7',
      brandSoft:  '#0C1A38',
      brandInk:   '#A8C4FC',
      accent:     '#6CA0F0',
      accentSoft: '#0C1828',
      warn:       '#E8A84A',
      danger:     '#E05555',
      success:    '#3EAA84',
    },
  },
  pawra: {
    name: 'Pawra',
    // Custom palette: warm amber (#8c5826) brand, orange (#ff9934) accent,
    // yellow (#f8f246) highlight, teal (#2cbbc3) success/link, sky (#e1f1f2) bg.
    light: {
      bg:         '#E1F1F2',   // #e1f1f2 — sky tint base
      bgRaised:   '#EEF8F9',
      surface:    '#FFFFFF',
      surfaceAlt: '#D0E8EA',
      ink:        '#1A0E05',   // deep warm near-black
      inkSoft:    '#5A3A1C',   // warm brown mid-tone
      inkMuted:   '#9A7A5C',   // muted tan
      hairline:   'rgba(140,88,38,0.12)',
      brand:      '#8C5826',   // #8c5826 — warm amber brown (main)
      brandSoft:  '#F5E0C8',
      brandInk:   '#4A2810',
      accent:     '#FF9934',   // #ff9934 — orange accent
      accentSoft: '#FFF0DC',
      warn:       '#F8F246',   // #f8f246 — yellow warn
      danger:     '#D84040',
      success:    '#2CBBC3',   // #2cbbc3 — teal success
    },
    dark: {
      bg:         '#120A03',
      bgRaised:   '#1E1006',
      surface:    '#2A1808',
      surfaceAlt: '#3A2210',
      ink:        '#F5EAD8',
      inkSoft:    '#C8A880',
      inkMuted:   '#8A6840',
      hairline:   'rgba(255,153,52,0.14)',
      brand:      '#D4844A',   // amber lightened for dark bg
      brandSoft:  '#3A1C08',
      brandInk:   '#F5C898',
      accent:     '#FF9934',
      accentSoft: '#3A2008',
      warn:       '#F8F246',
      danger:     '#E05050',
      success:    '#2CBBC3',
    },
  },
  gram: {
    name: 'Gram',
    // #0a0a0a base + Instagram purple-pink gradient brand (#833AB4 → #E1306C midpoint #C13584).
    light: {
      bg:         '#0A0A0A',
      bgRaised:   '#111111',
      surface:    '#1A1A1A',
      surfaceAlt: '#242424',
      ink:        '#F5F5F5',
      inkSoft:    '#909090',
      inkMuted:   '#585858',
      hairline:   'rgba(193,53,132,0.18)',
      brand:      '#C13584',   // Instagram purple-pink midpoint
      brandSoft:  '#2A0A1E',
      brandInk:   '#F0AACC',
      accent:     '#833AB4',   // Instagram deep purple
      accentSoft: '#1E0A2E',
      warn:       '#E8A84A',
      danger:     '#E05555',
      success:    '#3EAA84',
    },
    dark: {
      bg:         '#0A0A0A',
      bgRaised:   '#111111',
      surface:    '#1A1A1A',
      surfaceAlt: '#242424',
      ink:        '#F5F5F5',
      inkSoft:    '#909090',
      inkMuted:   '#585858',
      hairline:   'rgba(193,53,132,0.18)',
      brand:      '#C13584',
      brandSoft:  '#2A0A1E',
      brandInk:   '#F0AACC',
      accent:     '#833AB4',
      accentSoft: '#1E0A2E',
      warn:       '#E8A84A',
      danger:     '#E05555',
      success:    '#3EAA84',
    },
  },
  mcfc: {
    name: 'Man City',
    // Manchester City: celestial sky blue #6CABDD + dark navy #1C2C5B.
    light: {
      bg:         '#EFF5FB',   // ice-white with sky blue warmth
      bgRaised:   '#F7FAFD',
      surface:    '#FFFFFF',
      surfaceAlt: '#DCEAf5',
      ink:        '#0A1826',   // very dark navy
      inkSoft:    '#2E4A68',
      inkMuted:   '#6E90B0',
      hairline:   'rgba(28,44,91,0.10)',
      brand:      '#6CABDD',   // Man City celestial blue
      brandSoft:  '#D0E8F6',
      brandInk:   '#0C3060',
      accent:     '#1C2C5B',   // Man City navy
      accentSoft: '#CDD4E8',
      warn:       '#C97A3A',
      danger:     '#C84848',
      success:    '#3E9E78',
    },
    dark: {
      bg:         '#06101E',   // deep navy black
      bgRaised:   '#0C1A2E',
      surface:    '#112238',
      surfaceAlt: '#1A3050',
      ink:        '#E8F2FA',
      inkSoft:    '#A0C4DC',
      inkMuted:   '#5A84A0',
      hairline:   'rgba(108,171,221,0.12)',
      brand:      '#6CABDD',   // sky blue unchanged — pops on navy
      brandSoft:  '#081E38',
      brandInk:   '#B8D8F0',
      accent:     '#8FCCE8',
      accentSoft: '#081828',
      warn:       '#E0995B',
      danger:     '#D87455',
      success:    '#7CC8A0',
    },
  },
  lbci: {
    name: 'LBCI',
    // LBCI Lebanon: deep navy blue primary, red accent — their signature broadcast identity.
    light: {
      bg:         '#F5F7FA',
      bgRaised:   '#FFFFFF',
      surface:    '#FFFFFF',
      surfaceAlt: '#EDF0F5',
      ink:        '#0C1A35',
      inkSoft:    '#3A4E6E',
      inkMuted:   '#7A8EA8',
      hairline:   'rgba(12,26,53,0.09)',
      brand:      '#1A3A6E',   // LBCI deep navy
      brandSoft:  '#D8E2F0',
      brandInk:   '#0C1A35',
      accent:     '#1A3A6E',   // same navy — red reserved for danger/emergency only
      accentSoft: '#D8E2F0',
      warn:       '#C97A3A',
      danger:     '#D42B2B',   // LBCI red — emergency and destructive actions only
      success:    '#2E7D55',
    },
    dark: {
      bg:         '#070D1A',
      bgRaised:   '#0D1628',
      surface:    '#121F38',
      surfaceAlt: '#192848',
      ink:        '#EBF0FA',
      inkSoft:    '#A0B0CC',
      inkMuted:   '#607090',
      hairline:   'rgba(235,240,250,0.08)',
      brand:      '#5080C8',   // navy lightened for dark bg
      brandSoft:  '#0D1A38',
      brandInk:   '#B8CCF0',
      accent:     '#5080C8',   // navy on dark — matches brand
      accentSoft: '#0D1A38',
      warn:       '#E0995B',
      danger:     '#E84444',   // red on dark — emergency and destructive only
      success:    '#4CAF84',
    },
  },
  cedar: {
    name: 'Cedar',
    light: {
      bg: '#EEEEE8', bgRaised: '#F6F6F0', surface: '#FFFFFF', surfaceAlt: '#E2E2D8',
      ink: '#1A1F1C', inkSoft: '#42504A', inkMuted: '#75847C',
      hairline: 'rgba(30,45,40,0.10)',
      brand: '#1F5142', brandSoft: '#C9D9D2', brandInk: '#0F2C24',
      accent: '#C97A3A', accentSoft: '#F0D8BD',
      warn: '#C97A3A', danger: '#A8392A', success: '#1F5142',
    },
    dark: {
      bg: '#0D110F', bgRaised: '#141916', surface: '#1A201C', surfaceAlt: '#222824',
      ink: '#E8EAE5', inkSoft: '#B5BCB6', inkMuted: '#75847C',
      hairline: 'rgba(232,234,229,0.08)',
      brand: '#5FAA8F', brandSoft: '#102822', brandInk: '#C9E5DA',
      accent: '#E0995B', accentSoft: '#3A2515',
      warn: '#E0995B', danger: '#D87455', success: '#5FAA8F',
    },
  },
};

export const FONT = {
  sans: 'System',
  serif: 'Georgia',
  mono: 'Menlo',
};

export function usePawraTheme(themeName: ThemeName, dark: boolean): Theme {
  return useMemo(() => {
    const t = PAWRA_THEMES[themeName] || PAWRA_THEMES.sky;
    return dark ? t.dark : t.light;
  }, [themeName, dark]);
}
