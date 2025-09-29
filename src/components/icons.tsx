import type { SVGProps } from 'react';

export function VtuBossLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z"
        />
        <path
          d="M168 93.36a16 16 0 0 1 8.53 29.85l-48 26.67a16 16 0 0 1-17.06 0l-48-26.67a16 16 0 1 1 17.06-29.7l39.47 21.93 39.47-21.93A16 16 0 0 1 168 93.36Z"
          opacity="0.5"
        />
        <path
          d="m112.53 175.49 48-26.67a16 16 0 1 0-17.06-29.7L104 141.05l-39.47-21.93a16 16 0 1 0-17.06 29.7l48 26.67a16 16 0 0 0 17.06 0Z"
        />
      </g>
    </svg>
  );
}
