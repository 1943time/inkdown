import React from 'react'
import type { SVGProps } from 'react'

export function IStop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      {...props}
    >
      <rect
        width={10}
        height={10}
        x={3}
        y={3}
        fill="currentColor"
        rx={2}
      ></rect>
    </svg>
  )
}
