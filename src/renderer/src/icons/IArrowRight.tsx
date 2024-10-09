import React from 'react'
import type { SVGProps } from 'react'

export function IArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="m10 17l5-5m0 0l-5-5"
      ></path>
    </svg>
  )
}
