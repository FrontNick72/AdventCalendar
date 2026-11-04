import type { CSSProperties } from 'react';

type IconName = 'letter' | 'star' | 'arrow' | 'close' | 'gift' | 'check' | 'settings' | 'music';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    music: <><path d="M12 23V8l14-3v15M12 12l14-3" /><ellipse cx="8" cy="24" rx="4" ry="3" /><ellipse cx="22" cy="21" rx="4" ry="3" /></>,
    letter: <><rect x="3" y="5" width="26" height="22" rx="2" /><path d="m4 6 12 11L28 6M4 26l9-9m15 9-9-9" /></>,
    star: <path d="m16 3 3.7 8 8.8 1.1-6.5 6 1.8 8.7-7.8-4.4-7.8 4.4 1.8-8.7-6.5-6 8.8-1.1Z" />,
    arrow: <path d="m19 6-10 10 10 10" />,
    close: <path d="m8 8 16 16M24 8 8 24" />,
    gift: <><path d="M5 15h22v14H5zM3 9h26v6H3zM16 9v20" /><path d="M16 9C2 11 5-3 12 3l4 6Zm0 0c14 2 11-12 4-6l-4 6Z" /></>,
    check: <path d="m6 16 7 7L27 9" />,
    settings: <><circle cx="16" cy="16" r="5" /><path d="M16 3v4m0 18v4M3 16h4m18 0h4M7 7l3 3m12 12 3 3M7 25l3-3M22 10l3-3" /></>,
  };
  return <svg aria-hidden="true" className={`icon ${className}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Sprig({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <svg className={`sprig ${className}`} style={style} aria-hidden="true" viewBox="0 0 160 60" fill="none">
    <path d="M13 49C55 42 89 24 143 15" stroke="#777b48" strokeWidth="2" />
    {[22, 39, 56, 73, 90, 107, 124].map((x, i) => <g key={x} transform={`translate(${x} ${44 - i * 4}) rotate(-14)`}>
      <path d="M0 0Q-9-19-1-21Q7-16 5-2M7-2Q18-18 21-11Q21-3 7 2" fill={i % 2 ? '#777948' : '#596447'} />
    </g>)}
    <path d="m83 31 7-14m-3 12 15-10" stroke="#835144" />
    <circle cx="90" cy="15" r="4" fill="#923e3b" /><circle cx="105" cy="18" r="4" fill="#a14943" /><circle cx="98" cy="9" r="3.5" fill="#8a3938" />
  </svg>;
}
