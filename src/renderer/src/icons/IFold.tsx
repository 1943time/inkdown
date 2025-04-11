import * as React from 'react'
import { SVGProps } from 'react'

export const IFold = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={2}
    strokeLinecap="round"
    viewBox="0 0 24 24"
    strokeLinejoin="round"
    width={'1em'}
    height={'1em'}
    fill={'none'}
    {...props}
  >
    <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM10 4v16M4 7h3M4 10h3M4 13h3" />
  </svg>
)
