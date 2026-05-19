import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type Props = {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

export function Icon({ name, size = 20, color = '#000', strokeWidth = 1.6, fill = 'none' }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
  };
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill,
  };

  switch (name) {
    case 'paw':
      return (
        <Svg {...common}>
          <Ellipse cx="6" cy="9" rx="2" ry="2.6" fill={color} />
          <Ellipse cx="18" cy="9" rx="2" ry="2.6" fill={color} />
          <Ellipse cx="9.5" cy="5.5" rx="1.7" ry="2.2" fill={color} />
          <Ellipse cx="14.5" cy="5.5" rx="1.7" ry="2.2" fill={color} />
          <Path d="M12 11c-3.6 0-5.6 2.6-5.6 5 0 2 1.5 3.5 3.4 3.5.9 0 1.4-.3 2.2-.3s1.3.3 2.2.3c1.9 0 3.4-1.5 3.4-3.5 0-2.4-2-5-5.6-5z" fill={color} />
        </Svg>
      );
    case 'home':
      return <Svg {...common}><Path {...stroke} d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" /></Svg>;
    case 'search':
      return <Svg {...common}><Circle {...stroke} cx="11" cy="11" r="7" /><Path {...stroke} d="M20 20l-3.5-3.5" /></Svg>;
    case 'bag':
      return <Svg {...common}><Path {...stroke} d="M5 8h14l-1 12a1 1 0 01-1 1H7a1 1 0 01-1-1z" /><Path {...stroke} d="M9 8V6a3 3 0 016 0v2" /></Svg>;
    case 'list':
      return <Svg {...common}><Path {...stroke} d="M4 6h16M4 12h16M4 18h10" /></Svg>;
    case 'user':
      return <Svg {...common}><Circle {...stroke} cx="12" cy="8" r="4" /><Path {...stroke} d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></Svg>;
    case 'bell':
      return <Svg {...common}><Path {...stroke} d="M6 8a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7" /><Path {...stroke} d="M10 21a2 2 0 004 0" /></Svg>;
    case 'chevron-right':
      return <Svg {...common}><Path {...stroke} d="M9 6l6 6-6 6" /></Svg>;
    case 'chevron-left':
      return <Svg {...common}><Path {...stroke} d="M15 6l-6 6 6 6" /></Svg>;
    case 'chevron-down':
      return <Svg {...common}><Path {...stroke} d="M6 9l6 6 6-6" /></Svg>;
    case 'plus':
      return <Svg {...common}><Path {...stroke} d="M12 5v14M5 12h14" /></Svg>;
    case 'minus':
      return <Svg {...common}><Path {...stroke} d="M5 12h14" /></Svg>;
    case 'x':
      return <Svg {...common}><Path {...stroke} d="M6 6l12 12M18 6L6 18" /></Svg>;
    case 'check':
      return <Svg {...common}><Path {...stroke} d="M4 12l5 5L20 6" /></Svg>;
    case 'star':
      return <Svg {...common}><Path d="M12 2l3 6.5 7 1-5 4.8 1.2 7L12 17.8l-6.2 3.5 1.2-7-5-4.8 7-1z" fill={color} /></Svg>;
    case 'star-line':
      return <Svg {...common}><Path {...stroke} d="M12 2l3 6.5 7 1-5 4.8 1.2 7L12 17.8l-6.2 3.5 1.2-7-5-4.8 7-1z" /></Svg>;
    case 'heart':
      return <Svg {...common}><Path {...stroke} d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" /></Svg>;
    case 'pin':
      return <Svg {...common}><Path {...stroke} d="M12 22s7-7 7-12a7 7 0 00-14 0c0 5 7 12 7 12z" /><Circle {...stroke} cx="12" cy="10" r="2.5" /></Svg>;
    case 'clock':
      return <Svg {...common}><Circle {...stroke} cx="12" cy="12" r="9" /><Path {...stroke} d="M12 7v5l3 2" /></Svg>;
    case 'calendar':
      return <Svg {...common}><Rect {...stroke} x="3" y="5" width="18" height="16" rx="2" /><Path {...stroke} d="M3 10h18M8 3v4M16 3v4" /></Svg>;
    case 'walk':
      return <Svg {...common}><Circle {...stroke} cx="13" cy="4.5" r="1.6" /><Path {...stroke} d="M9 21l2.5-5.5L9 13l1.5-4 4 1.5 3 3" /><Path {...stroke} d="M7 11l2-2 2 1" /></Svg>;
    case 'scissors':
      return <Svg {...common}><Circle {...stroke} cx="6" cy="6" r="2.5" /><Circle {...stroke} cx="6" cy="18" r="2.5" /><Path {...stroke} d="M8 8l12 10M8 16L20 6" /></Svg>;
    case 'stethoscope':
      return <Svg {...common}><Path {...stroke} d="M5 4v6a4 4 0 008 0V4M5 4h2M11 4h2" /><Circle {...stroke} cx="17" cy="17" r="2" /><Path {...stroke} d="M9 14a4 4 0 008 0v-3" /></Svg>;
    case 'house':
      return <Svg {...common}><Path {...stroke} d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" /></Svg>;
    case 'bone':
      return <Svg {...common}><Path {...stroke} d="M5 9c0-1.5 1-2.5 2.5-2.5S10 7.5 10 9l4 0c0-1.5 1-2.5 2.5-2.5S19 7.5 19 9c1.5 0 2.5 1 2.5 2.5S20.5 14 19 14c0 1.5-1 2.5-2.5 2.5S14 15.5 14 14h-4c0 1.5-1 2.5-2.5 2.5S5 15.5 5 14c-1.5 0-2.5-1-2.5-2.5S3.5 9 5 9z" /></Svg>;
    case 'send':
      return <Svg {...common}><Path {...stroke} d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></Svg>;
    case 'filter':
      return <Svg {...common}><Path {...stroke} d="M3 5h18M6 12h12M10 19h4" /></Svg>;
    case 'map':
      return <Svg {...common}><Path {...stroke} d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16" /></Svg>;
    case 'phone':
      return <Svg {...common}><Path {...stroke} d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></Svg>;
    case 'shield':
      return <Svg {...common}><Path {...stroke} d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" /><Path {...stroke} d="M9 12l2 2 4-4" /></Svg>;
    case 'card':
      return <Svg {...common}><Rect {...stroke} x="3" y="6" width="18" height="13" rx="2" /><Path {...stroke} d="M3 10h18M7 15h3" /></Svg>;
    case 'truck':
      return <Svg {...common}><Path {...stroke} d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><Circle {...stroke} cx="7" cy="18" r="1.6" /><Circle {...stroke} cx="17" cy="18" r="1.6" /></Svg>;
    case 'speaker':
      return <Svg {...common}><Path {...stroke} d="M5 9v6h3l5 4V5L8 9H5z" /><Path {...stroke} d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14" /></Svg>;
    case 'vibrate':
      return <Svg {...common}><Rect {...stroke} x="9" y="5" width="6" height="14" rx="1" /><Path {...stroke} d="M5 10v4M3 11v2M19 10v4M21 11v2" /></Svg>;
    case 'edit':
      return <Svg {...common}><Path {...stroke} d="M4 20h4L20 8l-4-4L4 16zM14 6l4 4" /></Svg>;
    case 'camera':
      return <Svg {...common}><Path {...stroke} d="M3 8h4l2-3h6l2 3h4v11H3z" /><Circle {...stroke} cx="12" cy="13" r="3.5" /></Svg>;
    case 'mail':
      return <Svg {...common}><Rect {...stroke} x="3" y="5" width="18" height="14" rx="2" /><Path {...stroke} d="M3 7l9 6 9-6" /></Svg>;
    case 'lock':
      return <Svg {...common}><Rect {...stroke} x="5" y="11" width="14" height="10" rx="2" /><Path {...stroke} d="M8 11V7a4 4 0 018 0v4" /></Svg>;
    case 'check-circle':
      return <Svg {...common}><Circle {...stroke} cx="12" cy="12" r="9" /><Path {...stroke} d="M8 12l3 3 5-6" /></Svg>;
    case 'package':
      return <Svg {...common}><Path {...stroke} d="M3 7l9-4 9 4-9 4zM3 7v10l9 4M21 7v10l-9 4M7 5l10 4" /></Svg>;
    case 'tag':
      return <Svg {...common}><Path {...stroke} d="M3 12V4h8l10 10-8 8z" /><Circle {...stroke} cx="7.5" cy="7.5" r="1.5" /></Svg>;
    case 'inbox':
      return <Svg {...common}><Path {...stroke} d="M3 13h5l1 3h6l1-3h5" /><Path {...stroke} d="M3 13l3-8h12l3 8v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></Svg>;
    case 'settings':
      return <Svg {...common}><Circle {...stroke} cx="12" cy="12" r="3" /><Path {...stroke} d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></Svg>;
    case 'storefront':
      return <Svg {...common}><Path {...stroke} d="M3 9l2-5h14l2 5M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9" /><Path {...stroke} d="M9 20v-6h6v6" /></Svg>;
    case 'power':
      return <Svg {...common}><Path {...stroke} d="M12 3v9M5.5 7.5a8 8 0 1013 0" /></Svg>;
    case 'arrow-right':
      return <Svg {...common}><Path {...stroke} d="M5 12h14M13 5l7 7-7 7" /></Svg>;
    case 'arrow-up-right':
      return <Svg {...common}><Path {...stroke} d="M7 17L17 7M7 7h10v10" /></Svg>;
    case 'sparkle':
      return <Svg {...common}><Path {...stroke} d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4 4M14.4 14.4l4 4M5.6 18.4l4-4M14.4 9.6l4-4" /></Svg>;
    case 'logo':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Ellipse cx="8" cy="10" rx="2.4" ry="3" fill={color} />
          <Ellipse cx="24" cy="10" rx="2.4" ry="3" fill={color} />
          <Ellipse cx="12.5" cy="5.9" rx="2" ry="2.6" fill={color} />
          <Ellipse cx="19.5" cy="5.9" rx="2" ry="2.6" fill={color} />
          <Path d="M16 14c-4.4 0-7 3.2-7 6.2 0 2.4 1.8 4.3 4.2 4.3 1.1 0 1.7-.4 2.8-.4s1.7.4 2.8.4c2.4 0 4.2-1.9 4.2-4.3 0-3-2.6-6.2-7-6.2z" fill={color} />
        </Svg>
      );
    case 'plus-medical':
      return <Svg {...common}><Path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z" fill={color} /></Svg>;
    case 'navigation':
      // Compass-arrow / paper-plane shape pointing top-right.
      return <Svg {...common}><Path {...stroke} d="M3 11l18-7-7 18-2.5-7.5z" /></Svg>;
    case 'briefcase':
      return <Svg {...common}><Rect {...stroke} x="3" y="7" width="18" height="13" rx="2" /><Path {...stroke} d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" /></Svg>;
    case 'car':
      return (
        <Svg {...common}>
          <Path {...stroke} d="M4 14h16M7 14V9l2-3h6l2 3v5" />
          <Rect {...stroke} x="2" y="14" width="20" height="5" rx="1" />
          <Circle {...stroke} cx="7" cy="19" r="1.8" />
          <Circle {...stroke} cx="17" cy="19" r="1.8" />
          <Path {...stroke} d="M2 17h1M21 17h1" />
        </Svg>
      );
    case 'flower':
      return (
        <Svg {...common}>
          <Circle {...stroke} cx="12" cy="12" r="2.2" />
          <Path {...stroke} d="M12 2c0 0 2 3 2 5a2 2 0 01-4 0c0-2 2-5 2-5z" />
          <Path {...stroke} d="M12 22c0 0-2-3-2-5a2 2 0 014 0c0 2-2 5-2 5z" />
          <Path {...stroke} d="M2 12c0 0 3-2 5-2a2 2 0 010 4c-2 0-5-2-5-2z" />
          <Path {...stroke} d="M22 12c0 0-3 2-5 2a2 2 0 010-4c2 0 5 2 5 2z" />
          <Path {...stroke} d="M4.9 4.9c0 0 3.3.5 4.6 1.9a2 2 0 01-2.8 2.8C5.4 8.3 4.9 4.9 4.9 4.9z" />
          <Path {...stroke} d="M19.1 19.1c0 0-3.3-.5-4.6-1.9a2 2 0 012.8-2.8c1.3 1.4 1.8 4.7 1.8 4.7z" />
          <Path {...stroke} d="M19.1 4.9c0 0-.5 3.3-1.9 4.6a2 2 0 01-2.8-2.8c1.4-1.3 4.7-1.8 4.7-1.8z" />
          <Path {...stroke} d="M4.9 19.1c0 0 .5-3.3 1.9-4.6a2 2 0 012.8 2.8c-1.4 1.3-4.7 1.8-4.7 1.8z" />
        </Svg>
      );
    default:
      return null;
  }
}
