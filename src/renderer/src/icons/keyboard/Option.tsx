import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={48}
    height={48}
    viewBox="0 -960 960 960"
    fill={'currentColor'}
    {...props}
  >
    <path d="M597-200 320-700H120v-60h234l277 500h209v60H597Zm13-500v-60h230v60H610Z" />
  </svg>
)
export default SvgComponent
